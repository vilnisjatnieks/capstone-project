import "server-only";

import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Types / DTOs
// ---------------------------------------------------------------------------

export interface CheckoutDTO {
    id: string;
    work_id: string;
    user_id: string;
    checked_out_at: string;
    due_date: string;
    returned_at: string | null;
    reminder_sent_at: string | null;
    extension_status: "none" | "pending" | "approved" | "rejected";
    created_at: string;
    updated_at: string;
    work_title: string;
    user_name: string;
    user_email: string;
}

export interface CheckoutBaseDTO {
    id: string;
    work_id: string;
    user_id: string;
    checked_out_at: string;
    due_date: string;
    returned_at: string | null;
    reminder_sent_at: string | null;
    extension_status: "none" | "pending" | "approved" | "rejected";
    created_at: string;
    updated_at: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function requireStaffUser() {
    const user = await getCurrentUser();
    if (!user) {
        throw new Error("Unauthorized");
    }
    if (user.role !== "admin" && user.role !== "staff") {
        throw new Error("Forbidden");
    }
    return user;
}

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

/** List all checkouts with joined work & user info (staff only). */
export async function getAllCheckouts(): Promise<CheckoutDTO[]> {
    await requireStaffUser();

    const result = await query(
        `SELECT c.id, c.work_id, c.user_id, c.checked_out_at, c.due_date,
                c.returned_at, c.reminder_sent_at, c.extension_status, c.created_at, c.updated_at,
                w.title AS work_title,
                u.name AS user_name, u.email AS user_email
         FROM checkouts c
         JOIN works w ON w.id = c.work_id
         JOIN users u ON u.id = c.user_id
         ORDER BY c.created_at DESC`
    );

    return result.rows as CheckoutDTO[];
}

/** Get a single checkout by ID with joined work & user info (staff only). */
export async function getCheckoutById(
    id: string
): Promise<CheckoutDTO | null> {
    await requireStaffUser();

    const result = await query(
        `SELECT c.id, c.work_id, c.user_id, c.checked_out_at, c.due_date,
                c.returned_at, c.reminder_sent_at, c.extension_status, c.created_at, c.updated_at,
                w.title AS work_title,
                u.name AS user_name, u.email AS user_email
         FROM checkouts c
         JOIN works w ON w.id = c.work_id
         JOIN users u ON u.id = c.user_id
         WHERE c.id = $1`,
        [id]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0] as CheckoutDTO;
}

/** Get all checkouts for a given user ID.  */
export async function getUserCheckouts(userId: string): Promise<CheckoutDTO[]> {
    const result = await query(
        `SELECT c.id, c.work_id, c.user_id, c.checked_out_at, c.due_date,
                c.returned_at, c.reminder_sent_at, c.extension_status, c.created_at, c.updated_at,
                w.title AS work_title,
                u.name AS user_name, u.email AS user_email
         FROM checkouts c
         JOIN works w ON w.id = c.work_id
         JOIN users u ON u.id = c.user_id
         WHERE c.user_id = $1
         ORDER BY c.created_at DESC`,
        [userId]
    );

    return result.rows as CheckoutDTO[];
}

/** Check if a user has at least one returned checkout for a work. */
export async function hasReturnedCheckout(
    userId: string,
    workId: string
): Promise<boolean> {
    const result = await query(
        "SELECT id FROM checkouts WHERE user_id = $1 AND work_id = $2 AND returned_at IS NOT NULL LIMIT 1",
        [userId, workId]
    );
    return result.rows.length > 0;
}

/** Check if a specific work is currently checked out. Return true if checked out. */
export async function isWorkCheckedOut(workId: string): Promise<boolean> {
    await requireStaffUser();

    const activeCheckout = await query(
        "SELECT id FROM checkouts WHERE work_id = $1 AND returned_at IS NULL",
        [workId]
    );

    return activeCheckout.rows.length > 0;
}

/** Get the active (not returned) checkout ID for a specific work, if any. Return null if none. */
export async function getActiveCheckoutForWork(
    workId: string
): Promise<string | null> {
    await requireStaffUser();

    const activeCheckout = await query(
        "SELECT id FROM checkouts WHERE work_id = $1 AND returned_at IS NULL",
        [workId]
    );

    if (activeCheckout.rows.length === 0) return null;
    return activeCheckout.rows[0].id as string;
}

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

/**
 * Create a new checkout (staff only).
 * Validates that the work and user exist, and the work is not already checked out.
 * Returns the new checkout or throws with an error message.
 */
export async function createCheckout(input: {
    work_id: string;
    user_id: string;
    due_date: string;
}): Promise<CheckoutBaseDTO> {
    await requireStaffUser();

    // Check that the work exists
    const workResult = await query("SELECT id FROM works WHERE id = $1", [
        input.work_id,
    ]);
    if (workResult.rows.length === 0) {
        throw new Error("Work not found");
    }

    // Check that the user exists
    const userResult = await query("SELECT id FROM users WHERE id = $1", [
        input.user_id,
    ]);
    if (userResult.rows.length === 0) {
        throw new Error("User not found");
    }

    // Check that the work is not already checked out
    const activeCheckout = await query(
        "SELECT id FROM checkouts WHERE work_id = $1 AND returned_at IS NULL",
        [input.work_id]
    );
    if (activeCheckout.rows.length > 0) {
        throw new Error("This work is already checked out");
    }

    const result = await query(
        `INSERT INTO checkouts (work_id, user_id, due_date)
         VALUES ($1, $2, $3)
         RETURNING id, work_id, user_id, checked_out_at, due_date, returned_at,
                   reminder_sent_at, extension_status, created_at, updated_at`,
        [input.work_id, input.user_id, input.due_date]
    );

    // Remove any hold on this work since it's now checked out
    await query("DELETE FROM holds WHERE work_id = $1", [input.work_id]);

    return result.rows[0] as CheckoutBaseDTO;
}

/**
 * Mark a checkout as returned (staff only).
 * Returns the updated checkout or null if not found / already returned.
 */
export async function returnCheckout(
    id: string
): Promise<CheckoutBaseDTO | null> {
    await requireStaffUser();

    const result = await query(
        `UPDATE checkouts SET returned_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND returned_at IS NULL
         RETURNING id, work_id, user_id, checked_out_at, due_date, returned_at,
                   reminder_sent_at, extension_status, created_at, updated_at`,
        [id]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0] as CheckoutBaseDTO;
}

/**
 * Get checkouts that are due within the given number of days and haven't had a reminder sent.
 */
export async function getCheckoutsNeedingReminders(
    daysOut: number
): Promise<CheckoutDTO[]> {
    const result = await query(
        `SELECT c.id, c.work_id, c.user_id, c.checked_out_at, c.due_date,
                c.returned_at, c.reminder_sent_at, c.extension_status, c.created_at, c.updated_at,
                w.title AS work_title,
                u.name AS user_name, u.email AS user_email
         FROM checkouts c
         JOIN works w ON w.id = c.work_id
         JOIN users u ON u.id = c.user_id
         WHERE c.returned_at IS NULL
           AND c.reminder_sent_at IS NULL
           AND c.due_date <= NOW() + ($1 || ' days')::interval;`,
        [daysOut.toString()]
    );

    return result.rows as CheckoutDTO[];
}

/**
 * Mark a checkout as having had a reminder sent.
 */
export async function markReminderSent(id: string): Promise<void> {
    await query(
        `UPDATE checkouts SET reminder_sent_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [id]
    );
}

/**
 * Request an extension for a checkout (User only).
 * Requires the checkout to be active (not returned) and for it to belong to the user.
 */
export async function requestCheckoutExtension(
    id: string,
    userId: string
): Promise<CheckoutBaseDTO | null> {
    const result = await query(
        `UPDATE checkouts SET extension_status = 'pending', updated_at = NOW()
         WHERE id = $1 AND user_id = $2 AND returned_at IS NULL AND extension_status = 'none'
         RETURNING id, work_id, user_id, checked_out_at, due_date, returned_at,
                   reminder_sent_at, extension_status, created_at, updated_at`,
        [id, userId]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0] as CheckoutBaseDTO;
}

/**
 * Approve a checkout extension (Staff only).
 * Adds 14 days to the due_date and marks status as 'approved'.
 */
export async function approveCheckoutExtension(
    id: string
): Promise<CheckoutBaseDTO | null> {
    await requireStaffUser();

    const result = await query(
        `UPDATE checkouts 
         SET due_date = due_date + interval '14 days',
             extension_status = 'approved',
             updated_at = NOW()
         WHERE id = $1 AND returned_at IS NULL AND extension_status = 'pending'
         RETURNING id, work_id, user_id, checked_out_at, due_date, returned_at,
                   reminder_sent_at, extension_status, created_at, updated_at`,
        [id]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0] as CheckoutBaseDTO;
}

/**
 * Reject a checkout extension (Staff only).
 * Marks status as 'rejected'.
 */
export async function rejectCheckoutExtension(
    id: string
): Promise<CheckoutBaseDTO | null> {
    await requireStaffUser();

    const result = await query(
        `UPDATE checkouts 
         SET extension_status = 'rejected',
             updated_at = NOW()
         WHERE id = $1 AND returned_at IS NULL AND extension_status = 'pending'
         RETURNING id, work_id, user_id, checked_out_at, due_date, returned_at,
                   reminder_sent_at, extension_status, created_at, updated_at`,
        [id]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0] as CheckoutBaseDTO;
}

// ---------------------------------------------------------------------------
// Public read operations (no auth required)
// ---------------------------------------------------------------------------

export interface PopularWorkDTO {
    id: string;
    title: string;
    date_published: string | null;
    publisher: string | null;
    editor: string | null;
    lccn: string | null;
    isbn_10: string | null;
    isbn_13: string | null;
    media_type: string | null;
    number_of_pages: number | null;
    language: string | null;
    location: string | null;
    call_number: string | null;
    has_cover: boolean;
    updated_at: string;
    checkout_count: number;
}

/**
 * Get works ordered by checkout count (most popular first).
 * Public — no auth required.
 * Optionally filter by tag (genre) when tagId is provided.
 */
export async function getPopularWorks(tagId?: string): Promise<PopularWorkDTO[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    let tagJoin = "";
    if (tagId) {
        tagJoin = "JOIN work_tags wt ON wt.work_id = w.id";
        conditions.push(`wt.tag_id = $${paramIndex}`);
        values.push(tagId);
        paramIndex++;
    }

    const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await query(
        `SELECT w.id, w.title, w.date_published, w.publisher, w.editor,
                w.lccn, w.isbn_10, w.isbn_13, w.media_type, w.number_of_pages,
                w.language, w.location, w.call_number,
                (w.cover IS NOT NULL) as has_cover,
                w.updated_at,
                COALESCE(COUNT(c.id), 0)::int AS checkout_count
         FROM works w
         LEFT JOIN checkouts c ON c.work_id = w.id
         ${tagJoin} ${whereClause}
         GROUP BY w.id
         ORDER BY checkout_count DESC
         LIMIT 50`,
        values.length > 0 ? values : undefined
    );

    return result.rows as PopularWorkDTO[];
}
