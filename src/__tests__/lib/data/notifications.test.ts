/**
 * @jest-environment node
 */

const mockGetCurrentUser = jest.fn();
jest.mock("@/lib/auth", () => ({
    getCurrentUser: () => mockGetCurrentUser(),
}));

jest.mock("next/headers", () => ({
    cookies: jest.fn(),
}));

const mockQuery = jest.fn();
jest.mock("@/lib/db", () => ({
    query: (text: string, params?: unknown[]) => mockQuery(text, params),
}));

import {
    createNotification,
    getUnreadNotifications,
    markNotificationRead,
    markAllNotificationsRead,
} from "@/lib/data/notifications";

const regularUser = { id: "user-1", email: "user@example.com", name: "User", role: "user" };

beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(regularUser);
});

// ─── createNotification ─────────────────────────────────────────────

describe("createNotification", () => {
    it("inserts a notification with checkoutId", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await createNotification("user-1", "Your book is overdue.", "checkout-1");

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO notifications"),
            ["user-1", "Your book is overdue.", "checkout-1"]
        );
    });

    it("inserts a notification without checkoutId (null)", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await createNotification("user-1", "A message.");

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO notifications"),
            ["user-1", "A message.", null]
        );
    });
});

// ─── getUnreadNotifications ─────────────────────────────────────────

describe("getUnreadNotifications", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        await expect(getUnreadNotifications("user-1")).rejects.toThrow("Unauthorized");
    });

    it("returns unread notifications for the user", async () => {
        const rows = [
            { id: "n1", message: "Book overdue", checkout_id: "c1", created_at: "2026-01-01T00:00:00Z" },
        ];
        mockQuery.mockResolvedValue({ rows });

        const result = await getUnreadNotifications("user-1");

        expect(result).toEqual(rows);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("read_at IS NULL"),
            ["user-1"]
        );
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("ORDER BY created_at DESC"),
            ["user-1"]
        );
    });

    it("returns empty array when no unread notifications", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const result = await getUnreadNotifications("user-1");

        expect(result).toEqual([]);
    });
});

// ─── markNotificationRead ───────────────────────────────────────────

describe("markNotificationRead", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        await expect(markNotificationRead("n1", "user-1")).rejects.toThrow("Unauthorized");
    });

    it("updates read_at scoped to user_id", async () => {
        mockQuery.mockResolvedValue({ rowCount: 1 });

        await markNotificationRead("n1", "user-1");

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("UPDATE notifications SET read_at"),
            ["n1", "user-1"]
        );
    });
});

// ─── markAllNotificationsRead ───────────────────────────────────────

describe("markAllNotificationsRead", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        await expect(markAllNotificationsRead("user-1")).rejects.toThrow("Unauthorized");
    });

    it("marks all unread notifications for the user", async () => {
        mockQuery.mockResolvedValue({ rowCount: 3 });

        await markAllNotificationsRead("user-1");

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("UPDATE notifications SET read_at"),
            ["user-1"]
        );
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("WHERE user_id = $1"),
            ["user-1"]
        );
    });
});
