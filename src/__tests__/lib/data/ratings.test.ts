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

const mockHasReturnedCheckout = jest.fn();
jest.mock("@/lib/data/checkouts", () => ({
    hasReturnedCheckout: (userId: string, workId: string) =>
        mockHasReturnedCheckout(userId, workId),
}));

import {
    getWorkRatingSummary,
    getWorkRatingSummaries,
    getUserRatingForWork,
    upsertRating,
    deleteRating,
} from "@/lib/data/ratings";

const regularUser = {
    id: "user-1",
    email: "user@example.com",
    name: "User",
    role: "user",
};

beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(regularUser);
    mockHasReturnedCheckout.mockResolvedValue(true);
});

// ─── getWorkRatingSummary ──────────────────────────────────────────

describe("getWorkRatingSummary", () => {
    it("returns average and count when ratings exist", async () => {
        mockQuery.mockResolvedValue({
            rows: [{ average_rating: 4.5, rating_count: 10 }],
        });

        const result = await getWorkRatingSummary("w1");

        expect(result).toEqual({ average_rating: 4.5, rating_count: 10 });
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("AVG(rating)"),
            ["w1"]
        );
    });

    it("returns null average and zero count when no ratings", async () => {
        mockQuery.mockResolvedValue({
            rows: [{ average_rating: null, rating_count: 0 }],
        });

        const result = await getWorkRatingSummary("w1");

        expect(result).toEqual({ average_rating: null, rating_count: 0 });
    });
});

// ─── getWorkRatingSummaries ────────────────────────────────────────

describe("getWorkRatingSummaries", () => {
    it("returns empty object for empty array", async () => {
        const result = await getWorkRatingSummaries([]);
        expect(result).toEqual({});
        expect(mockQuery).not.toHaveBeenCalled();
    });

    it("returns summaries grouped by work id", async () => {
        const rows = [
            { work_id: "w1", average_rating: 4.0, rating_count: 5 },
            { work_id: "w2", average_rating: 3.5, rating_count: 2 },
        ];
        mockQuery.mockResolvedValue({ rows });

        const result = await getWorkRatingSummaries(["w1", "w2"]);

        expect(result["w1"]).toEqual({ average_rating: 4.0, rating_count: 5 });
        expect(result["w2"]).toEqual({ average_rating: 3.5, rating_count: 2 });
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("IN ($1, $2)"),
            ["w1", "w2"]
        );
    });

    it("returns empty object when no ratings exist for works", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const result = await getWorkRatingSummaries(["w1"]);

        expect(result).toEqual({});
    });
});

// ─── getUserRatingForWork ──────────────────────────────────────────

describe("getUserRatingForWork", () => {
    it("returns user rating when it exists", async () => {
        const rating = {
            id: "r1",
            work_id: "w1",
            user_id: "user-1",
            rating: 4,
            created_at: "2026-01-01",
            updated_at: "2026-01-01",
        };
        mockQuery.mockResolvedValue({ rows: [rating] });

        const result = await getUserRatingForWork("user-1", "w1");

        expect(result).toEqual(rating);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("WHERE user_id = $1 AND work_id = $2"),
            ["user-1", "w1"]
        );
    });

    it("returns null when no rating exists", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const result = await getUserRatingForWork("user-1", "w1");

        expect(result).toBeNull();
    });
});

// ─── upsertRating ──────────────────────────────────────────────────

describe("upsertRating", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        await expect(upsertRating("w1", 4)).rejects.toThrow("Unauthorized");
    });

    it("throws when rating is less than 1", async () => {
        await expect(upsertRating("w1", 0)).rejects.toThrow(
            "Rating must be between 1 and 5"
        );
    });

    it("throws when rating is greater than 5", async () => {
        await expect(upsertRating("w1", 6)).rejects.toThrow(
            "Rating must be between 1 and 5"
        );
    });

    it("throws when rating is not an integer", async () => {
        await expect(upsertRating("w1", 3.5)).rejects.toThrow(
            "Rating must be between 1 and 5"
        );
    });

    it("throws when user has not returned the book", async () => {
        mockHasReturnedCheckout.mockResolvedValue(false);
        await expect(upsertRating("w1", 4)).rejects.toThrow(
            "You must check out and return this book before rating it"
        );
    });

    it("creates a new rating successfully", async () => {
        const newRating = {
            id: "r1",
            work_id: "w1",
            user_id: "user-1",
            rating: 4,
            created_at: "2026-01-01",
            updated_at: "2026-01-01",
        };
        mockQuery.mockResolvedValue({ rows: [newRating] });

        const result = await upsertRating("w1", 4);

        expect(result).toEqual(newRating);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO ratings"),
            ["w1", "user-1", 4]
        );
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("ON CONFLICT"),
            ["w1", "user-1", 4]
        );
    });

    it("checks hasReturnedCheckout with correct user and work", async () => {
        mockQuery.mockResolvedValue({
            rows: [{ id: "r1", work_id: "w1", user_id: "user-1", rating: 5 }],
        });

        await upsertRating("w1", 5);

        expect(mockHasReturnedCheckout).toHaveBeenCalledWith("user-1", "w1");
    });
});

// ─── deleteRating ──────────────────────────────────────────────────

describe("deleteRating", () => {
    it("throws Unauthorized when not authenticated", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        await expect(deleteRating("w1")).rejects.toThrow("Unauthorized");
    });

    it("returns true when rating is deleted", async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: "r1" }] });

        const result = await deleteRating("w1");

        expect(result).toBe(true);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("DELETE FROM ratings"),
            ["user-1", "w1"]
        );
    });

    it("returns false when rating not found", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const result = await deleteRating("w1");

        expect(result).toBe(false);
    });
});
