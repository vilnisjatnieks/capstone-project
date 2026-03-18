import "server-only";

import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Types / DTOs
// ---------------------------------------------------------------------------

export interface HoldDTO {
    id: string;
    work_id: string;
    user_id: string;
    user_name: string;
    created_at: string;
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

/** Get the current hold for a work, or null (public). */
export async function getHoldForWork(
    workId: string
): Promise<HoldDTO | null> {
    const result = await query(
        `SELECT h.id, h.work_id, h.user_id, u.name AS user_name, h.created_at
         FROM holds h
         JOIN users u ON u.id = h.user_id
         WHERE h.work_id = $1`,
        [workId]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0] as HoldDTO;
}

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

/** Place a hold on a work (authenticated). */
export async function createHold(workId: string): Promise<HoldDTO> {
    const user = await requireAuthenticatedUser();

    // Check that the work exists
    const workResult = await query("SELECT id FROM works WHERE id = $1", [
        workId,
    ]);
    if (workResult.rows.length === 0) {
        throw new Error("Work not found");
    }

    // Check if work is already on hold
    const existingHold = await query(
        "SELECT id FROM holds WHERE work_id = $1",
        [workId]
    );
    if (existingHold.rows.length > 0) {
        throw new Error("This work is already on hold");
    }

    // Check if user already has a hold
    const userHold = await query(
        "SELECT id FROM holds WHERE user_id = $1",
        [user.id]
    );
    if (userHold.rows.length > 0) {
        throw new Error("You already have a work on hold");
    }

    const result = await query(
        `INSERT INTO holds (work_id, user_id)
         VALUES ($1, $2)
         RETURNING id, work_id, user_id, created_at`,
        [workId, user.id]
    );

    const hold = result.rows[0];

    return {
        id: hold.id,
        work_id: hold.work_id,
        user_id: hold.user_id,
        user_name: user.name,
        created_at: hold.created_at,
    } as HoldDTO;
}

/** Remove a hold on a work (owner or staff/admin). */
export async function deleteHold(workId: string): Promise<void> {
    const user = await requireAuthenticatedUser();

    const holdResult = await query(
        "SELECT id, user_id FROM holds WHERE work_id = $1",
        [workId]
    );

    if (holdResult.rows.length === 0) {
        throw new Error("Hold not found");
    }

    const hold = holdResult.rows[0];
    const isOwner = hold.user_id === user.id;
    const isStaffOrAdmin = user.role === "staff" || user.role === "admin";

    if (!isOwner && !isStaffOrAdmin) {
        throw new Error("Forbidden");
    }

    await query("DELETE FROM holds WHERE id = $1", [hold.id]);
}
