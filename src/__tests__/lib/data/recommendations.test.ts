/**
 * @jest-environment node
 */

jest.mock("@/lib/auth", () => ({
    getCurrentUser: jest.fn(),
}));

jest.mock("next/headers", () => ({
    cookies: jest.fn(),
}));

const mockQuery = jest.fn();
jest.mock("@/lib/db", () => ({
    query: (text: string, params?: unknown[]) => mockQuery(text, params),
}));

import {
    getTagBasedRecommendations,
    getTopRatedFallback,
    getRecommendations,
    ANONYMOUS_USER_ID,
} from "@/lib/data/recommendations";

const USER_ID = "user-abc";

const makeWorkRow = (overrides: Record<string, unknown> = {}) => ({
    id: "1",
    title: "A Good Book",
    media_type: "book",
    publisher: "Pub Co",
    has_cover: true,
    updated_at: "2024-01-01T00:00:00Z",
    tag_overlap_count: "2",
    avg_rating: "4.50",
    ...overrides,
});

beforeEach(() => {
    jest.clearAllMocks();
});

// ─── getTagBasedRecommendations ────────────────────────────────────

describe("getTagBasedRecommendations", () => {
    it("returns mapped recommendation DTOs when tag overlap exists", async () => {
        const row = makeWorkRow();
        mockQuery.mockResolvedValue({ rows: [row] });

        const results = await getTagBasedRecommendations(USER_ID);

        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
            id: "1",
            title: "A Good Book",
            media_type: "book",
            publisher: "Pub Co",
            has_cover: true,
            avg_rating: 4.5,
            tag_overlap_count: 2,
            recommendation_source: "tags",
        });
    });

    it("returns empty array when user has no checkouts (no tag overlap)", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const results = await getTagBasedRecommendations(USER_ID);

        expect(results).toEqual([]);
    });

    it("passes userId and limit as query parameters", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await getTagBasedRecommendations(USER_ID, 5);

        expect(mockQuery).toHaveBeenCalledWith(
            expect.any(String),
            [USER_ID, 5]
        );
    });

    it("SQL query joins work_tags and excludes already-checked-out works", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await getTagBasedRecommendations(USER_ID);

        const [sql] = mockQuery.mock.calls[0];
        expect(sql).toContain("JOIN work_tags");
        expect(sql).toContain("NOT IN");
        expect(sql).toContain("checkouts");
    });

    it("orders results by tag_overlap_count descending", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await getTagBasedRecommendations(USER_ID);

        const [sql] = mockQuery.mock.calls[0];
        expect(sql).toContain("tag_overlap_count DESC");
    });

    it("handles null avg_rating gracefully", async () => {
        const row = makeWorkRow({ avg_rating: null });
        mockQuery.mockResolvedValue({ rows: [row] });

        const results = await getTagBasedRecommendations(USER_ID);

        expect(results[0].avg_rating).toBeNull();
    });
});

// ─── getTopRatedFallback ───────────────────────────────────────────

describe("getTopRatedFallback", () => {
    it("returns mapped recommendation DTOs", async () => {
        const row = makeWorkRow({ tag_overlap_count: "0" });
        mockQuery.mockResolvedValue({ rows: [row] });

        const results = await getTopRatedFallback(USER_ID);

        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
            id: "1",
            tag_overlap_count: 0,
            recommendation_source: "top_rated",
        });
    });

    it("returns empty array when catalog is empty", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const results = await getTopRatedFallback(USER_ID);

        expect(results).toEqual([]);
    });

    it("works with the anonymous sentinel UUID (unauthenticated path)", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await getTopRatedFallback(ANONYMOUS_USER_ID);

        expect(mockQuery).toHaveBeenCalledWith(
            expect.any(String),
            [ANONYMOUS_USER_ID, expect.any(Number)]
        );
    });

    it("passes userId and limit as query parameters", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await getTopRatedFallback(USER_ID, 4);

        expect(mockQuery).toHaveBeenCalledWith(
            expect.any(String),
            [USER_ID, 4]
        );
    });

    it("SQL query uses AVG(r.rating) and excludes checked-out works", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await getTopRatedFallback(USER_ID);

        const [sql] = mockQuery.mock.calls[0];
        expect(sql).toContain("AVG(r.rating)");
        expect(sql).toContain("NOT IN");
    });

    it("handles null avg_rating gracefully", async () => {
        const row = makeWorkRow({ avg_rating: null, tag_overlap_count: "0" });
        mockQuery.mockResolvedValue({ rows: [row] });

        const results = await getTopRatedFallback(USER_ID);

        expect(results[0].avg_rating).toBeNull();
    });
});

// ─── getRecommendations (orchestrator) ────────────────────────────

describe("getRecommendations", () => {
    it("returns tag-based results with source 'tags' when Tier 1 has results", async () => {
        const row = makeWorkRow();
        mockQuery.mockResolvedValue({ rows: [row] });

        const { results, source } = await getRecommendations(USER_ID);

        expect(source).toBe("tags");
        expect(results).toHaveLength(1);
        expect(results[0].recommendation_source).toBe("tags");
        // Only Tier 1 query should have been called
        expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it("falls back to top_rated when Tier 1 returns empty", async () => {
        const row = makeWorkRow({ tag_overlap_count: "0" });
        mockQuery
            .mockResolvedValueOnce({ rows: [] })       // Tier 1 — empty
            .mockResolvedValueOnce({ rows: [row] });   // Tier 2 — top-rated

        const { results, source } = await getRecommendations(USER_ID);

        expect(source).toBe("top_rated");
        expect(results).toHaveLength(1);
        expect(results[0].recommendation_source).toBe("top_rated");
        expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it("returns empty results with source 'top_rated' when both tiers return nothing", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const { results, source } = await getRecommendations(USER_ID);

        expect(source).toBe("top_rated");
        expect(results).toEqual([]);
    });

    it("propagates DB errors", async () => {
        mockQuery.mockRejectedValue(new Error("DB connection failed"));

        await expect(getRecommendations(USER_ID)).rejects.toThrow(
            "DB connection failed"
        );
    });
});
