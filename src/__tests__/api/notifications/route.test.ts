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

const mockGetUnreadNotifications = jest.fn();
const mockMarkNotificationRead = jest.fn();
const mockMarkAllNotificationsRead = jest.fn();

jest.mock("@/lib/data/notifications", () => ({
    getUnreadNotifications: (userId: string) => mockGetUnreadNotifications(userId),
    markNotificationRead: (id: string, userId: string) =>
        mockMarkNotificationRead(id, userId),
    markAllNotificationsRead: (userId: string) =>
        mockMarkAllNotificationsRead(userId),
}));

import { GET } from "@/app/api/notifications/route";
import { PUT as PUT_READ } from "@/app/api/notifications/[id]/read/route";
import { PUT as PUT_READ_ALL } from "@/app/api/notifications/read-all/route";
import { NextRequest } from "next/server";

const user = { id: "user-1", email: "user@example.com", name: "User", role: "user" };

function makeParams(id: string) {
    return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(user);
});

// ─── GET /api/notifications ──────────────────────────────────────────

describe("GET /api/notifications", () => {
    it("returns 401 when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const res = await GET();
        expect(res.status).toBe(401);
    });

    it("returns unread notifications for the current user", async () => {
        const notifications = [
            { id: "n1", message: "Book overdue", checkout_id: "c1", created_at: "2026-01-01T00:00:00Z" },
        ];
        mockGetUnreadNotifications.mockResolvedValue(notifications);

        const res = await GET();
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual(notifications);
        expect(mockGetUnreadNotifications).toHaveBeenCalledWith("user-1");
    });

    it("returns empty array when no notifications", async () => {
        mockGetUnreadNotifications.mockResolvedValue([]);

        const res = await GET();
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual([]);
    });

    it("returns 500 on unexpected error", async () => {
        mockGetCurrentUser.mockRejectedValue(new Error("DB error"));
        const res = await GET();
        expect(res.status).toBe(500);
    });
});

// ─── PUT /api/notifications/[id]/read ───────────────────────────────

describe("PUT /api/notifications/[id]/read", () => {
    it("returns 401 when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const req = new NextRequest("http://localhost:3000/api/notifications/n1/read", {
            method: "PUT",
        });
        const res = await PUT_READ(req, makeParams("n1"));
        expect(res.status).toBe(401);
    });

    it("marks the notification as read", async () => {
        mockMarkNotificationRead.mockResolvedValue(undefined);
        const req = new NextRequest("http://localhost:3000/api/notifications/n1/read", {
            method: "PUT",
        });
        const res = await PUT_READ(req, makeParams("n1"));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(mockMarkNotificationRead).toHaveBeenCalledWith("n1", "user-1");
    });

    it("returns 500 on unexpected error", async () => {
        mockGetCurrentUser.mockRejectedValue(new Error("DB error"));
        const req = new NextRequest("http://localhost:3000/api/notifications/n1/read", {
            method: "PUT",
        });
        const res = await PUT_READ(req, makeParams("n1"));
        expect(res.status).toBe(500);
    });
});

// ─── PUT /api/notifications/read-all ────────────────────────────────

describe("PUT /api/notifications/read-all", () => {
    it("returns 401 when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const res = await PUT_READ_ALL();
        expect(res.status).toBe(401);
    });

    it("marks all notifications as read", async () => {
        mockMarkAllNotificationsRead.mockResolvedValue(undefined);
        const res = await PUT_READ_ALL();
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(mockMarkAllNotificationsRead).toHaveBeenCalledWith("user-1");
    });

    it("returns 500 on unexpected error", async () => {
        mockGetCurrentUser.mockRejectedValue(new Error("DB error"));
        const res = await PUT_READ_ALL();
        expect(res.status).toBe(500);
    });
});
