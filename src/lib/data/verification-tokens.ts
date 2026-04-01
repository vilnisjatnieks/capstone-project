import "server-only";

import { query } from "@/lib/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VerificationTokenType = "email_verification" | "password_reset";

// ---------------------------------------------------------------------------
// Token operations
// ---------------------------------------------------------------------------

/**
 * Create a new verification token for a user.
 * Deletes any prior token of the same type for that user first.
 * expiresAt: absolute Date computed by the caller
 *   e.g. new Date(Date.now() + 24 * 60 * 60 * 1000) for 24h
 */
export async function createVerificationToken(
  userId: string,
  type: VerificationTokenType,
  expiresAt: Date
): Promise<string> {
  await query(
    "DELETE FROM verification_tokens WHERE user_id = $1 AND type = $2",
    [userId, type]
  );

  const result = await query(
    `INSERT INTO verification_tokens (user_id, type, expires_at)
     VALUES ($1, $2, $3)
     RETURNING token`,
    [userId, type, expiresAt]
  );

  return result.rows[0].token as string;
}

/**
 * Look up a non-expired token.
 * Returns null if not found.
 * Deletes the row on lookup if it is expired (cleanup-on-read pattern).
 */
export async function getVerificationToken(
  token: string,
  type: VerificationTokenType
): Promise<{ userId: string } | null> {
  const result = await query(
    "SELECT user_id, expires_at FROM verification_tokens WHERE token = $1 AND type = $2",
    [token, type]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0] as { user_id: string; expires_at: Date };

  if (new Date(row.expires_at) <= new Date()) {
    await query("DELETE FROM verification_tokens WHERE token = $1", [token]);
    return null;
  }

  return { userId: row.user_id };
}

/** Delete a token after it has been used. */
export async function deleteVerificationToken(token: string): Promise<void> {
  await query("DELETE FROM verification_tokens WHERE token = $1", [token]);
}
