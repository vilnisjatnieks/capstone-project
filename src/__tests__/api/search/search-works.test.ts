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

// Query call order:
// 1. Main paginated search (SELECT ... LIMIT ... OFFSET)
// 2. attachAuthorsToWorks (FROM work_authors) — only if main returned rows
// 3. Distinct languages (SELECT DISTINCT w.language)
// 4. getTagsForWorks
// 5. getWorkRatingSummaries
function mockSearchWithTags(
    works: Record<string, unknown>[],
    tagRows: Record<string, unknown>[] = [],
    ratingRows: Record<string, unknown>[] = [],
    languages: { language: string }[] = []
) {
    const worksWithCount = works.map((w) => ({ ...w, total_count: String(works.length) }));
    mockQuery.mockResolvedValueOnce({ rows: worksWithCount });
    if (works.length > 0) {
        mockQuery.mockResolvedValueOnce({ rows: [] }); // attachAuthorsToWorks
    }
    mockQuery.mockResolvedValueOnce({ rows: languages });
    if (works.length > 0) {
        // getTagsForWorks and getWorkRatingSummaries early-return on empty workIds
        mockQuery
            .mockResolvedValueOnce({ rows: tagRows })
            .mockResolvedValueOnce({ rows: ratingRows });
    }
}

describe("GET /api/search/works", () => {
    it("returns paginated works with tags and default pageSize 25", async () => {
        const works = [
            { id: "1", title: "Book A" },
            { id: "2", title: "Book B" },
        ];
        mockSearchWithTags(works);

        const res = await GET(makeRequest());
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual({
            items: [
                { id: "1", title: "Book A", authors: [], tags: [], average_rating: null, rating_count: 0 },
                { id: "2", title: "Book B", authors: [], tags: [], average_rating: null, rating_count: 0 },
            ],
            total: 2,
            page: 1,
            pageSize: 25,
            languages: [],
        });
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("LIMIT $1 OFFSET $2"),
            [25, 0]
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
        expect(body.items[0].tags).toEqual([
            { id: "t1", name: "Fiction", color: "#ff0000", created_at: "x", updated_at: "x" },
        ]);
    });

    it("filters by search query", async () => {
        mockSearchWithTags([{ id: "1", title: "Gatsby" }]);

        const res = await GET(makeRequest({ q: "gatsby" }));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.items).toHaveLength(1);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("ILIKE"),
            ["%gatsby%", 25, 0]
        );
    });

    it("filters by media type", async () => {
        mockSearchWithTags([{ id: "1", title: "E-Book" }]);

        const res = await GET(makeRequest({ media_type: "ebook" }));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.items).toHaveLength(1);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("w.media_type = $1"),
            ["ebook", 25, 0]
        );
    });

    it("filters by tag", async () => {
        mockSearchWithTags([{ id: "1", title: "Tagged Book" }]);

        const res = await GET(makeRequest({ tag: "tag-uuid-1" }));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.items).toHaveLength(1);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("JOIN work_tags"),
            ["tag-uuid-1", 25, 0]
        );
    });

    it("filters by language", async () => {
        mockSearchWithTags([{ id: "1", title: "Livre" }]);

        const res = await GET(makeRequest({ lang: "French" }));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.items).toHaveLength(1);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("w.language = $1"),
            ["French", 25, 0]
        );
    });

    it("applies sort and direction server-side", async () => {
        mockSearchWithTags([]);

        await GET(makeRequest({ sort: "date_published", dir: "desc" }));

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("ORDER BY w.date_published DESC"),
            [25, 0]
        );
    });

    it("ignores disallowed sort values and falls back to title asc", async () => {
        mockSearchWithTags([]);

        await GET(makeRequest({ sort: "password_hash; DROP TABLE users" }));

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("ORDER BY w.title ASC"),
            [25, 0]
        );
    });

    it("applies page and pageSize params", async () => {
        mockSearchWithTags([]);

        await GET(makeRequest({ page: "3", pageSize: "10" }));

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("LIMIT $1 OFFSET $2"),
            [10, 20]
        );
    });

    it("returns distinct languages from result set", async () => {
        mockSearchWithTags(
            [{ id: "1", title: "x" }],
            [],
            [],
            [{ language: "English" }, { language: "Spanish" }]
        );

        const res = await GET(makeRequest());
        const body = await res.json();

        expect(body.languages).toEqual(["English", "Spanish"]);
    });

    it("returns empty items when no matches", async () => {
        mockSearchWithTags([]);

        const res = await GET(makeRequest({ q: "nonexistent" }));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.items).toEqual([]);
        expect(body.total).toBe(0);
    });

    it("trims whitespace from query params", async () => {
        mockSearchWithTags([]);

        await GET(makeRequest({ q: "  gatsby  " }));

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("ILIKE"),
            ["%gatsby%", 25, 0]
        );
    });

    it("ignores empty query string", async () => {
        mockSearchWithTags([]);

        await GET(makeRequest({ q: "   " }));

        expect(mockQuery).toHaveBeenCalledWith(
            expect.not.stringContaining("ILIKE"),
            [25, 0]
        );
    });
});
