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
    getAllCheckouts,
    getCheckoutById,
    createCheckout,
    returnCheckout,
} from "@/lib/data/checkouts";

const staffUser = {
    id: "staff-1",
    email: "staff@example.com",
    name: "Staff",
    role: "staff",
};

const adminUser = {
    id: "admin-1",
    email: "admin@example.com",
    name: "Admin",
    role: "admin",
};

const regularUser = {
    id: "user-1",
    email: "user@example.com",
    name: "User",
    role: "user",
};

beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(staffUser);
});

// ─── getAllCheckouts ─────────────────────────────────────────────────

describe("getAllCheckouts", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        await expect(getAllCheckouts()).rejects.toThrow("Unauthorized");
    });

    it("throws Forbidden when role is user", async () => {
        mockGetCurrentUser.mockResolvedValue(regularUser);
        await expect(getAllCheckouts()).rejects.toThrow("Forbidden");
    });

    it("allows admin users", async () => {
        mockGetCurrentUser.mockResolvedValue(adminUser);
        mockQuery.mockResolvedValue({ rows: [] });
        await expect(getAllCheckouts()).resolves.toEqual([]);
    });

    it("returns all checkouts with joined data", async () => {
        const checkouts = [
            { id: "c1", work_title: "Book A", user_name: "Alice" },
            { id: "c2", work_title: "Book B", user_name: "Bob" },
        ];
        mockQuery.mockResolvedValue({ rows: checkouts });

        const result = await getAllCheckouts();

        expect(result).toEqual(checkouts);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("JOIN works"),
            undefined
        );
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("JOIN users"),
            undefined
        );
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("ORDER BY c.created_at DESC"),
            undefined
        );
    });

    it("returns an empty array when no checkouts exist", async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const result = await getAllCheckouts();
        expect(result).toEqual([]);
    });
});

// ─── getCheckoutById ────────────────────────────────────────────────

describe("getCheckoutById", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        await expect(getCheckoutById("c1")).rejects.toThrow("Unauthorized");
    });

    it("throws Forbidden when role is user", async () => {
        mockGetCurrentUser.mockResolvedValue(regularUser);
        await expect(getCheckoutById("c1")).rejects.toThrow("Forbidden");
    });

    it("returns a checkout with joined data", async () => {
        const checkout = {
            id: "c1",
            work_id: "w1",
            user_id: "u1",
            work_title: "Book A",
            user_name: "Alice",
            user_email: "alice@example.com",
        };
        mockQuery.mockResolvedValue({ rows: [checkout] });

        const result = await getCheckoutById("c1");

        expect(result).toEqual(checkout);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("WHERE c.id = $1"),
            ["c1"]
        );
    });

    it("returns null when checkout not found", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const result = await getCheckoutById("c999");

        expect(result).toBeNull();
    });
});

// ─── createCheckout ─────────────────────────────────────────────────

describe("createCheckout", () => {
    const validInput = {
        work_id: "w1",
        user_id: "u1",
        due_date: "2026-03-01",
    };

    it("throws Unauthorized when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        await expect(createCheckout(validInput)).rejects.toThrow(
            "Unauthorized"
        );
    });

    it("throws Forbidden when role is user", async () => {
        mockGetCurrentUser.mockResolvedValue(regularUser);
        await expect(createCheckout(validInput)).rejects.toThrow("Forbidden");
    });

    it("throws when work does not exist", async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] }); // work lookup

        await expect(createCheckout(validInput)).rejects.toThrow(
            "Work not found"
        );
        expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it("throws when user does not exist", async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ id: "w1" }] }); // work exists
        mockQuery.mockResolvedValueOnce({ rows: [] }); // user lookup

        await expect(createCheckout(validInput)).rejects.toThrow(
            "User not found"
        );
        expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it("throws when work is already checked out", async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ id: "w1" }] }); // work exists
        mockQuery.mockResolvedValueOnce({ rows: [{ id: "u1" }] }); // user exists
        mockQuery.mockResolvedValueOnce({ rows: [{ id: "c1" }] }); // active checkout

        await expect(createCheckout(validInput)).rejects.toThrow(
            "This work is already checked out"
        );
        expect(mockQuery).toHaveBeenCalledTimes(3);
    });

    it("creates a checkout successfully", async () => {
        const newCheckout = {
            id: "c1",
            work_id: "w1",
            user_id: "u1",
            due_date: "2026-03-01",
            returned_at: null,
        };
        mockQuery.mockResolvedValueOnce({ rows: [{ id: "w1" }] }); // work exists
        mockQuery.mockResolvedValueOnce({ rows: [{ id: "u1" }] }); // user exists
        mockQuery.mockResolvedValueOnce({ rows: [] }); // no active checkout
        mockQuery.mockResolvedValueOnce({ rows: [newCheckout] }); // insert

        const result = await createCheckout(validInput);

        expect(result).toEqual(newCheckout);
        expect(mockQuery).toHaveBeenCalledTimes(4);
        expect(mockQuery).toHaveBeenLastCalledWith(
            expect.stringContaining("INSERT"),
            ["w1", "u1", "2026-03-01"]
        );
    });

    it("allows admin users to create checkouts", async () => {
        mockGetCurrentUser.mockResolvedValue(adminUser);
        const newCheckout = { id: "c2", work_id: "w1", user_id: "u1" };
        mockQuery.mockResolvedValueOnce({ rows: [{ id: "w1" }] });
        mockQuery.mockResolvedValueOnce({ rows: [{ id: "u1" }] });
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({ rows: [newCheckout] });

        const result = await createCheckout(validInput);

        expect(result).toEqual(newCheckout);
    });
});

// ─── returnCheckout ─────────────────────────────────────────────────

describe("returnCheckout", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        await expect(returnCheckout("c1")).rejects.toThrow("Unauthorized");
    });

    it("throws Forbidden when role is user", async () => {
        mockGetCurrentUser.mockResolvedValue(regularUser);
        await expect(returnCheckout("c1")).rejects.toThrow("Forbidden");
    });

    it("returns a checkout successfully", async () => {
        const returned = {
            id: "c1",
            work_id: "w1",
            user_id: "u1",
            returned_at: "2026-02-22T00:00:00Z",
        };
        mockQuery.mockResolvedValue({ rows: [returned] });

        const result = await returnCheckout("c1");

        expect(result).toEqual(returned);
        expect(result?.returned_at).toBeTruthy();
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("UPDATE checkouts SET returned_at"),
            ["c1"]
        );
    });

    it("returns null when checkout not found or already returned", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const result = await returnCheckout("c999");

        expect(result).toBeNull();
    });
});
