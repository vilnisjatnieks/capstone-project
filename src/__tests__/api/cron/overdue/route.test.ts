/**
 * @jest-environment node
 */

const mockGetOverdueCheckouts = jest.fn();
const mockMarkOverdueNotified = jest.fn();
const mockGetStaffAndAdminUsers = jest.fn();
const mockCreateNotification = jest.fn();

jest.mock("@/lib/data/checkouts", () => ({
    getOverdueCheckouts: () => mockGetOverdueCheckouts(),
    markOverdueNotified: (id: string) => mockMarkOverdueNotified(id),
}));

jest.mock("@/lib/data/users", () => ({
    getStaffAndAdminUsers: () => mockGetStaffAndAdminUsers(),
}));

jest.mock("@/lib/data/notifications", () => ({
    createNotification: (userId: string, message: string, checkoutId?: string) =>
        mockCreateNotification(userId, message, checkoutId),
}));

import { GET } from "@/app/api/cron/overdue/route";
import { NextRequest } from "next/server";

const CRON_SECRET = "test-secret";

function makeRequest(token?: string): NextRequest {
    const headers: Record<string, string> = {};
    if (token !== undefined) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    return new NextRequest("http://localhost:3000/api/cron/overdue", {
        method: "GET",
        headers,
    });
}

beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
});

// ─── Auth ───────────────────────────────────────────────────────────

describe("GET /api/cron/overdue — auth", () => {
    it("returns 401 when Authorization header is missing", async () => {
        const req = new NextRequest("http://localhost:3000/api/cron/overdue", {
            method: "GET",
        });
        const res = await GET(req);
        expect(res.status).toBe(401);
    });

    it("returns 401 when token is wrong", async () => {
        const res = await GET(makeRequest("wrong-token"));
        expect(res.status).toBe(401);
    });

    it("returns 401 when Authorization header does not start with Bearer", async () => {
        const req = new NextRequest("http://localhost:3000/api/cron/overdue", {
            method: "GET",
            headers: { Authorization: `Token ${CRON_SECRET}` },
        });
        const res = await GET(req);
        expect(res.status).toBe(401);
    });
});

// ─── No overdue checkouts ────────────────────────────────────────────

describe("GET /api/cron/overdue — no overdue", () => {
    it("returns 200 with processed 0 when no overdue checkouts", async () => {
        mockGetOverdueCheckouts.mockResolvedValue([]);

        const res = await GET(makeRequest(CRON_SECRET));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.processed).toBe(0);
        expect(mockCreateNotification).not.toHaveBeenCalled();
        expect(mockMarkOverdueNotified).not.toHaveBeenCalled();
    });
});

// ─── Happy path ──────────────────────────────────────────────────────

describe("GET /api/cron/overdue — happy path", () => {
    const overdueCheckouts = [
        {
            id: "c1",
            user_id: "user-1",
            due_date: "2026-01-01T00:00:00Z",
            user_email: "alice@example.com",
            user_name: "Alice",
            work_title: "Book A",
        },
        {
            id: "c2",
            user_id: "user-2",
            due_date: "2026-01-05T00:00:00Z",
            user_email: "bob@example.com",
            user_name: "Bob",
            work_title: "Book B",
        },
    ];

    const staffUsers = [
        { id: "staff-1", name: "Staff Member" },
    ];

    beforeEach(() => {
        mockGetOverdueCheckouts.mockResolvedValue(overdueCheckouts);
        mockGetStaffAndAdminUsers.mockResolvedValue(staffUsers);
        mockCreateNotification.mockResolvedValue(undefined);
        mockMarkOverdueNotified.mockResolvedValue(undefined);
    });

    it("returns 200 with processed count", async () => {
        const res = await GET(makeRequest(CRON_SECRET));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.processed).toBe(2);
    });

    it("creates a notification for each borrower", async () => {
        await GET(makeRequest(CRON_SECRET));

        expect(mockCreateNotification).toHaveBeenCalledWith(
            "user-1",
            expect.stringContaining("Book A"),
            "c1"
        );
        expect(mockCreateNotification).toHaveBeenCalledWith(
            "user-2",
            expect.stringContaining("Book B"),
            "c2"
        );
    });

    it("creates a notification for each staff user per overdue checkout", async () => {
        await GET(makeRequest(CRON_SECRET));

        expect(mockCreateNotification).toHaveBeenCalledWith(
            "staff-1",
            expect.stringContaining("Book A"),
            "c1"
        );
        expect(mockCreateNotification).toHaveBeenCalledWith(
            "staff-1",
            expect.stringContaining("Book B"),
            "c2"
        );
    });

    it("marks each checkout as overdue-notified", async () => {
        await GET(makeRequest(CRON_SECRET));

        expect(mockMarkOverdueNotified).toHaveBeenCalledTimes(2);
        expect(mockMarkOverdueNotified).toHaveBeenCalledWith("c1");
        expect(mockMarkOverdueNotified).toHaveBeenCalledWith("c2");
    });

    it("total notifications = (checkouts × (1 borrower + N staff))", async () => {
        await GET(makeRequest(CRON_SECRET));

        // 2 checkouts × (1 user + 1 staff) = 4 notifications
        expect(mockCreateNotification).toHaveBeenCalledTimes(4);
    });
});

// ─── Error handling ──────────────────────────────────────────────────

describe("GET /api/cron/overdue — error handling", () => {
    it("returns 500 when getOverdueCheckouts throws", async () => {
        mockGetOverdueCheckouts.mockRejectedValue(new Error("DB error"));

        const res = await GET(makeRequest(CRON_SECRET));

        expect(res.status).toBe(500);
    });
});
