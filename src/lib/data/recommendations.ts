import "server-only";

import { query } from "@/lib/db";

// ---------------------------------------------------------------------------
// Types / DTOs
// ---------------------------------------------------------------------------

export interface RecommendationDTO {
    id: string;
    title: string;
    media_type: string | null;
    publisher: string | null;
    has_cover: boolean;
    updated_at: string;
    avg_rating: number | null;
    tag_overlap_count: number;
    recommendation_source: "tags" | "top_rated";
}

// Sentinel UUID for unauthenticated users — never matches a real user_id,
// so the NOT IN subquery returns an empty set and all works are eligible.
export const ANONYMOUS_USER_ID = "00000000-0000-0000-0000-000000000000";

// ---------------------------------------------------------------------------
// Tier 1: Tag-based content filtering
// ---------------------------------------------------------------------------

/**
 * Returns works that share tags with books the user has checked out,
 * excluding works the user has already checked out.
 * Ordered by number of overlapping tags descending, then avg rating.
 */
export async function getTagBasedRecommendations(
    userId: string,
    limit = 8
): Promise<RecommendationDTO[]> {
    const result = await query(
        `SELECT
            w.id,
            w.title,
            w.media_type,
            w.publisher,
            (w.cover IS NOT NULL) AS has_cover,
            w.updated_at,
            COUNT(DISTINCT wt.tag_id)           AS tag_overlap_count,
            AVG(r.rating)::numeric(3,2)         AS avg_rating
        FROM works w
        JOIN work_tags wt ON wt.work_id = w.id
        JOIN work_tags user_wt ON user_wt.tag_id = wt.tag_id
        JOIN checkouts user_co
            ON user_co.work_id = user_wt.work_id
            AND user_co.user_id = $1
        LEFT JOIN ratings r ON r.work_id = w.id
        WHERE w.id NOT IN (
            SELECT work_id FROM checkouts WHERE user_id = $1
        )
        GROUP BY w.id, w.title, w.media_type, w.publisher, w.cover, w.updated_at
        ORDER BY tag_overlap_count DESC, avg_rating DESC NULLS LAST
        LIMIT $2`,
        [userId, limit]
    );

    return result.rows.map((row) => ({
        id: String(row.id),
        title: row.title,
        media_type: row.media_type,
        publisher: row.publisher,
        has_cover: Boolean(row.has_cover),
        updated_at: row.updated_at,
        avg_rating: row.avg_rating !== null ? Number(row.avg_rating) : null,
        tag_overlap_count: Number(row.tag_overlap_count),
        recommendation_source: "tags" as const,
    }));
}

// ---------------------------------------------------------------------------
// Tier 2: Top-rated fallback
// ---------------------------------------------------------------------------

/**
 * Returns the highest-rated works the user has not yet checked out.
 * Works with no ratings are included but ranked last.
 * Safe for unauthenticated users via the ANONYMOUS_USER_ID sentinel.
 */
export async function getTopRatedFallback(
    userId: string,
    limit = 8
): Promise<RecommendationDTO[]> {
    const result = await query(
        `SELECT
            w.id,
            w.title,
            w.media_type,
            w.publisher,
            (w.cover IS NOT NULL) AS has_cover,
            w.updated_at,
            0                               AS tag_overlap_count,
            AVG(r.rating)::numeric(3,2)     AS avg_rating
        FROM works w
        LEFT JOIN ratings r ON r.work_id = w.id
        WHERE w.id NOT IN (
            SELECT work_id FROM checkouts WHERE user_id = $1
        )
        GROUP BY w.id, w.title, w.media_type, w.publisher, w.cover, w.updated_at
        ORDER BY avg_rating DESC NULLS LAST, w.title ASC
        LIMIT $2`,
        [userId, limit]
    );

    return result.rows.map((row) => ({
        id: String(row.id),
        title: row.title,
        media_type: row.media_type,
        publisher: row.publisher,
        has_cover: Boolean(row.has_cover),
        updated_at: row.updated_at,
        avg_rating: row.avg_rating !== null ? Number(row.avg_rating) : null,
        tag_overlap_count: 0,
        recommendation_source: "top_rated" as const,
    }));
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

/**
 * Returns up to `limit` recommendations using a tiered strategy:
 *   1. Tag-based (personalized) — if the user has checkouts with tagged books
 *   2. Top-rated fallback       — always produces results
 */
export async function getRecommendations(
    userId: string,
    limit = 8
): Promise<{ results: RecommendationDTO[]; source: "tags" | "top_rated" }> {
    const tagBased = await getTagBasedRecommendations(userId, limit);
    if (tagBased.length > 0) {
        return { results: tagBased, source: "tags" };
    }

    const topRated = await getTopRatedFallback(userId, limit);
    return { results: topRated, source: "top_rated" };
}
