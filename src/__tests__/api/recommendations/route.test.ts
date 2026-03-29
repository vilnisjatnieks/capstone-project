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

const mockGetRecommendations = jest.fn();
jest.mock("@/lib/data/recommendations", () => ({
    getRecommendations: (...args: unknown[]) =>
        mockGetRecommendations(...args),
    ANONYMOUS_USER_ID: "00000000-0000-0000-0000-000000000000",
}));

import { GET } from "@/app/api/recommendations/route";

const regularUser = {
    id: "user-1",
    email: "user@example.com",
    name: "User",
    role: "user",
};

const sampleResult = {
    id: "w1",
    title: "Test Book",
    media_type: "book",
    publisher: null,
    has_cover: false,
    updated_at: "2024-01-01T00:00:00Z",
    avg_rating: 4.5,
    tag_overlap_count: 2,
    recommendation_source: "tags" as const,
};

beforeEach(() => {
    jest.clearAllMocks();
});

// ─── GET /api/recommendations ──────────────────────────────────────

describe("GET /api/recommendations", () => {
    it("returns 200 with tag-based recommendations for authenticated user", async () => {
        mockGetCurrentUser.mockResolvedValue(regularUser);
        mockGetRecommendations.mockResolvedValue({
            results: [sampleResult],
            source: "tags",
        });

        const res = await GET();
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual({ results: [sampleResult], source: "tags" });
        expect(mockGetRecommendations).toHaveBeenCalledWith(regularUser.id);
    });

    it("uses anonymous sentinel UUID for unauthenticated users", async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        mockGetRecommendations.mockResolvedValue({
            results: [sampleResult],
            source: "top_rated",
        });

        const res = await GET();
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.source).toBe("top_rated");
        expect(mockGetRecommendations).toHaveBeenCalledWith(
            "00000000-0000-0000-0000-000000000000"
        );
    });

    it("returns 200 with empty results when no recommendations available", async () => {
        mockGetCurrentUser.mockResolvedValue(regularUser);
        mockGetRecommendations.mockResolvedValue({
            results: [],
            source: "top_rated",
        });

        const res = await GET();
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.results).toEqual([]);
    });

    it("returns 500 on unexpected DB error", async () => {
        mockGetCurrentUser.mockResolvedValue(regularUser);
        mockGetRecommendations.mockRejectedValue(new Error("DB down"));

        const res = await GET();
        const body = await res.json();

        expect(res.status).toBe(500);
        expect(body).toEqual({ error: "Internal server error" });
    });
});
