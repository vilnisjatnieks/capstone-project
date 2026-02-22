import "server-only";

import { query } from "@/lib/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SessionUser {
    id: string;
    email: string;
    name: string;
    role: "admin" | "staff" | "user";
    created_at: Date;
    updated_at: Date;
}

// ---------------------------------------------------------------------------
// Session operations
// ---------------------------------------------------------------------------

/** Create a new session row and return its id. */
export async function createSession(
    userId: string,
    expiresAt: Date
): Promise<string> {
    const result = await query(
        "INSERT INTO sessions (user_id, expires_at) VALUES ($1, $2) RETURNING id",
        [userId, expiresAt]
    );
    return result.rows[0].id;
}

/** Delete a session by id. */
export async function deleteSession(sessionId: string): Promise<void> {
    await query("DELETE FROM sessions WHERE id = $1", [sessionId]);
}

/** Look up a valid (non-expired) session and return the associated user, or null. */
export async function getSessionWithUser(
    sessionId: string
): Promise<SessionUser | null> {
    const result = await query(
        `SELECT u.id, u.email, u.name, u.role, u.created_at, u.updated_at
         FROM users u
         JOIN sessions s ON s.user_id = u.id
         WHERE s.id = $1 AND s.expires_at > NOW()`,
        [sessionId]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0] as SessionUser;
}
