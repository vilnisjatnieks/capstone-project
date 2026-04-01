import "server-only";

import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Types / DTOs
// ---------------------------------------------------------------------------

export interface NotificationDTO {
    id: string;
    message: string;
    checkout_id: string | null;
    created_at: string;
}

// ---------------------------------------------------------------------------
// Internal helpers (no auth guard — called only from cron)
// ---------------------------------------------------------------------------

/** Create a notification for a user. */
export async function createNotification(
    userId: string,
    message: string,
    checkoutId?: string
): Promise<void> {
    await query(
        `INSERT INTO notifications (user_id, message, checkout_id)
         VALUES ($1, $2, $3)`,
        [userId, message, checkoutId ?? null]
    );
}

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

/** Get all unread notifications for a user. */
export async function getUnreadNotifications(
    userId: string
): Promise<NotificationDTO[]> {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    const result = await query(
        `SELECT id, message, checkout_id, created_at
         FROM notifications
         WHERE user_id = $1 AND read_at IS NULL
         ORDER BY created_at DESC`,
        [userId]
    );

    return result.rows as NotificationDTO[];
}

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

/** Mark a single notification as read (scoped to the requesting user). */
export async function markNotificationRead(
    id: string,
    userId: string
): Promise<void> {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    await query(
        `UPDATE notifications SET read_at = NOW()
         WHERE id = $1 AND user_id = $2 AND read_at IS NULL`,
        [id, userId]
    );
}

/** Mark all unread notifications as read for a user. */
export async function markAllNotificationsRead(userId: string): Promise<void> {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    await query(
        `UPDATE notifications SET read_at = NOW()
         WHERE user_id = $1 AND read_at IS NULL`,
        [userId]
    );
}
