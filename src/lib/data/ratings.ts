import "server-only";

import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { hasReturnedCheckout } from "@/lib/data/checkouts";

// ---------------------------------------------------------------------------
// Types / DTOs
// ---------------------------------------------------------------------------

export interface RatingDTO {
    id: string;
    work_id: string;
    user_id: string;
    rating: number;
    created_at: string;
    updated_at: string;
}

export interface WorkRatingSummary {
    average_rating: number | null;
    rating_count: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function requireAuthenticatedUser() {
    const user = await getCurrentUser();
    if (!user) {
        throw new Error("Unauthorized");
    }
    return user;
}

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

/** Get the average rating and count for a single work (public). */
export async function getWorkRatingSummary(
    workId: string
): Promise<WorkRatingSummary> {
    const result = await query(
        `SELECT AVG(rating)::FLOAT AS average_rating, COUNT(*)::INT AS rating_count
         FROM ratings WHERE work_id = $1`,
        [workId]
    );

    const row = result.rows[0];
    return {
        average_rating: row.rating_count > 0 ? Number(row.average_rating) : null,
        rating_count: Number(row.rating_count),
    };
}

/** Get rating summaries for multiple works in one query (public). */
export async function getWorkRatingSummaries(
    workIds: string[]
): Promise<Record<string, WorkRatingSummary>> {
    if (workIds.length === 0) return {};

    const placeholders = workIds.map((_, i) => `$${i + 1}`).join(", ");
    const result = await query(
        `SELECT work_id,
                AVG(rating)::FLOAT AS average_rating,
                COUNT(*)::INT AS rating_count
         FROM ratings
         WHERE work_id IN (${placeholders})
         GROUP BY work_id`,
        workIds
    );

    const map: Record<string, WorkRatingSummary> = {};
    for (const row of result.rows) {
        map[String(row.work_id)] = {
            average_rating: Number(row.average_rating),
            rating_count: Number(row.rating_count),
        };
    }
    return map;
}

/** Get the current user's rating for a work, or null (public). */
export async function getUserRatingForWork(
    userId: string,
    workId: string
): Promise<RatingDTO | null> {
    const result = await query(
        `SELECT id, work_id, user_id, rating, created_at, updated_at
         FROM ratings WHERE user_id = $1 AND work_id = $2`,
        [userId, workId]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0] as RatingDTO;
}

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

/** Create or update a rating (authenticated users who have returned the book). */
export async function upsertRating(
    workId: string,
    rating: number
): Promise<RatingDTO> {
    const user = await requireAuthenticatedUser();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new Error("Rating must be between 1 and 5");
    }

    const returned = await hasReturnedCheckout(user.id, workId);
    if (!returned) {
        throw new Error("You must check out and return this book before rating it");
    }

    const result = await query(
        `INSERT INTO ratings (work_id, user_id, rating)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, work_id)
         DO UPDATE SET rating = $3, updated_at = NOW()
         RETURNING id, work_id, user_id, rating, created_at, updated_at`,
        [workId, user.id, rating]
    );

    return result.rows[0] as RatingDTO;
}

/** Delete the current user's rating for a work. */
export async function deleteRating(workId: string): Promise<boolean> {
    const user = await requireAuthenticatedUser();

    const result = await query(
        "DELETE FROM ratings WHERE user_id = $1 AND work_id = $2 RETURNING id",
        [user.id, workId]
    );

    return result.rows.length > 0;
}
