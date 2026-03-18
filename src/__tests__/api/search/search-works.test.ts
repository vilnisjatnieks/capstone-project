/**
 * @jest-environment node
 */

const mockQuery = jest.fn();
jest.mock("@/lib/db", () => ({
    query: (text: string, params?: unknown[]) => mockQuery(text, params),
}));

import { GET } from "@/app/api/search/works/route";
import { NextRequest } from "next/server";

function makeRequest(params: Record<string, string> = {}): NextRequest {
    const url = new URL("http://localhost:3000/api/search/works");
    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
    }
    return new NextRequest(url.toString(), { method: "GET" });
}

beforeEach(() => {
    jest.clearAllMocks();
});

// Helper: first call returns works, second returns tags, third returns ratings
function mockSearchWithTags(
    works: Record<string, unknown>[],
    tagRows: Record<string, unknown>[] = [],
    ratingRows: Record<string, unknown>[] = []
) {
    mockQuery
        .mockResolvedValueOnce({ rows: works })      // searchWorks
        .mockResolvedValueOnce({ rows: tagRows })     // getTagsForWorks
        .mockResolvedValueOnce({ rows: ratingRows }); // getWorkRatingSummaries
}

describe("GET /api/search/works", () => {
    it("returns all works with tags when no query params", async () => {
        const works = [
            { id: "1", title: "Book A" },
            { id: "2", title: "Book B" },
        ];
        mockSearchWithTags(works);

        const res = await GET(makeRequest());
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual([
            { id: "1", title: "Book A", tags: [], average_rating: null, rating_count: 0 },
            { id: "2", title: "Book B", tags: [], average_rating: null, rating_count: 0 },
        ]);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("SELECT"),
            undefined
        );
    });

    it("includes tags on returned works", async () => {
        const works = [{ id: "1", title: "Book A" }];
        const tagRows = [
            { work_id: "1", id: "t1", name: "Fiction", color: "#ff0000", created_at: "x", updated_at: "x" },
        ];
        mockSearchWithTags(works, tagRows);

        const res = await GET(makeRequest());
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body[0].tags).toEqual([
            { id: "t1", name: "Fiction", color: "#ff0000", created_at: "x", updated_at: "x" },
        ]);
    });

    it("filters by search query", async () => {
        mockSearchWithTags([{ id: "1", title: "Gatsby" }]);

        const res = await GET(makeRequest({ q: "gatsby" }));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toHaveLength(1);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("ILIKE"),
            ["%gatsby%"]
        );
    });

    it("filters by media type", async () => {
        mockSearchWithTags([{ id: "1", title: "E-Book" }]);

        const res = await GET(makeRequest({ media_type: "ebook" }));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toHaveLength(1);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("w.media_type = $1"),
            ["ebook"]
        );
    });

    it("filters by tag", async () => {
        mockSearchWithTags([{ id: "1", title: "Tagged Book" }]);

        const res = await GET(makeRequest({ tag: "tag-uuid-1" }));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toHaveLength(1);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("JOIN work_tags"),
            ["tag-uuid-1"]
        );
    });

    it("combines search query and media type filter", async () => {
        mockSearchWithTags([]);

        const res = await GET(makeRequest({ q: "history", media_type: "book" }));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual([]);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("ILIKE"),
            ["%history%", "book"]
        );
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("w.media_type = $2"),
            ["%history%", "book"]
        );
    });

    it("returns empty array when no matches", async () => {
        mockSearchWithTags([]);

        const res = await GET(makeRequest({ q: "nonexistent" }));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual([]);
    });

    it("trims whitespace from query params", async () => {
        mockSearchWithTags([]);

        await GET(makeRequest({ q: "  gatsby  " }));

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("ILIKE"),
            ["%gatsby%"]
        );
    });

    it("ignores empty query string", async () => {
        mockSearchWithTags([]);

        await GET(makeRequest({ q: "   " }));

        expect(mockQuery).toHaveBeenCalledWith(
            expect.not.stringContaining("ILIKE"),
            undefined
        );
    });
});
