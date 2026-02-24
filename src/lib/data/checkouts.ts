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
                c.returned_at, c.created_at, c.updated_at,
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
                c.returned_at, c.created_at, c.updated_at,
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

/** Check if a specific work is currently checked out. Return true if checked out. */
export async function isWorkCheckedOut(workId: string): Promise<boolean> {
    await requireStaffUser();

    const activeCheckout = await query(
        "SELECT id FROM checkouts WHERE work_id = $1 AND returned_at IS NULL",
        [workId]
    );

    return activeCheckout.rows.length > 0;
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
                   created_at, updated_at`,
        [input.work_id, input.user_id, input.due_date]
    );

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
                   created_at, updated_at`,
        [id]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0] as CheckoutBaseDTO;
}
