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
    getHoldForWork,
    createHold,
    deleteHold,
} from "@/lib/data/holds";

const regularUser = {
    id: "user-1",
    email: "user@example.com",
    name: "User",
    role: "user",
};

const staffUser = {
    id: "staff-1",
    email: "staff@example.com",
    name: "Staff",
    role: "staff",
};

beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(regularUser);
});

// ─── getHoldForWork ──────────────────────────────────────────────

describe("getHoldForWork", () => {
    it("returns hold when it exists", async () => {
        const hold = {
            id: "h1",
            work_id: "w1",
            user_id: "user-1",
            user_name: "User",
            created_at: "2026-01-01",
        };
        mockQuery.mockResolvedValue({ rows: [hold] });

        const result = await getHoldForWork("w1");

        expect(result).toEqual(hold);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("WHERE h.work_id = $1"),
            ["w1"]
        );
    });

    it("returns null when no hold exists", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const result = await getHoldForWork("w1");

        expect(result).toBeNull();
    });

    it("joins users table for user_name", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await getHoldForWork("w1");

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("JOIN users"),
            ["w1"]
        );
    });
});

// ─── createHold ──────────────────────────────────────────────────

describe("createHold", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        await expect(createHold("w1")).rejects.toThrow("Unauthorized");
    });

    it("throws when work does not exist", async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] }); // work lookup

        await expect(createHold("w1")).rejects.toThrow("Work not found");
        expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it("throws when work is already on hold", async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ id: "w1" }] }); // work exists
        mockQuery.mockResolvedValueOnce({ rows: [{ id: "h1" }] }); // existing hold

        await expect(createHold("w1")).rejects.toThrow(
            "This work is already on hold"
        );
        expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it("throws when user already has a hold", async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ id: "w1" }] }); // work exists
        mockQuery.mockResolvedValueOnce({ rows: [] }); // no hold on work
        mockQuery.mockResolvedValueOnce({ rows: [{ id: "h2" }] }); // user has hold

        await expect(createHold("w1")).rejects.toThrow(
            "You already have a work on hold"
        );
        expect(mockQuery).toHaveBeenCalledTimes(3);
    });

    it("creates a hold successfully", async () => {
        const newHold = {
            id: "h1",
            work_id: "w1",
            user_id: "user-1",
            created_at: "2026-01-01",
        };
        mockQuery.mockResolvedValueOnce({ rows: [{ id: "w1" }] }); // work exists
        mockQuery.mockResolvedValueOnce({ rows: [] }); // no hold on work
        mockQuery.mockResolvedValueOnce({ rows: [] }); // user has no hold
        mockQuery.mockResolvedValueOnce({ rows: [newHold] }); // insert

        const result = await createHold("w1");

        expect(result).toEqual({
            ...newHold,
            user_name: "User",
        });
        expect(mockQuery).toHaveBeenCalledTimes(4);
        expect(mockQuery).toHaveBeenLastCalledWith(
            expect.stringContaining("INSERT INTO holds"),
            ["w1", "user-1"]
        );
    });
});

// ─── deleteHold ──────────────────────────────────────────────────

describe("deleteHold", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        await expect(deleteHold("w1")).rejects.toThrow("Unauthorized");
    });

    it("throws when hold not found", async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] }); // hold lookup

        await expect(deleteHold("w1")).rejects.toThrow("Hold not found");
    });

    it("throws Forbidden when user is not owner and not staff", async () => {
        const otherUser = { ...regularUser, id: "user-2" };
        mockGetCurrentUser.mockResolvedValue(otherUser);
        mockQuery.mockResolvedValueOnce({
            rows: [{ id: "h1", user_id: "user-1" }],
        }); // hold belongs to user-1

        await expect(deleteHold("w1")).rejects.toThrow("Forbidden");
    });

    it("allows owner to delete their hold", async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [{ id: "h1", user_id: "user-1" }],
        }); // hold lookup
        mockQuery.mockResolvedValueOnce({ rows: [] }); // delete

        await expect(deleteHold("w1")).resolves.toBeUndefined();
        expect(mockQuery).toHaveBeenCalledTimes(2);
        expect(mockQuery).toHaveBeenLastCalledWith(
            expect.stringContaining("DELETE FROM holds"),
            ["h1"]
        );
    });

    it("allows staff to delete any hold", async () => {
        mockGetCurrentUser.mockResolvedValue(staffUser);
        mockQuery.mockResolvedValueOnce({
            rows: [{ id: "h1", user_id: "user-1" }],
        }); // hold belongs to another user
        mockQuery.mockResolvedValueOnce({ rows: [] }); // delete

        await expect(deleteHold("w1")).resolves.toBeUndefined();
        expect(mockQuery).toHaveBeenCalledTimes(2);
    });
});
