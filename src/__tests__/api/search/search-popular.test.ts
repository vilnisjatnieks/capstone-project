/**
 * @jest-environment node
 */

const mockQuery = jest.fn();
jest.mock("@/lib/db", () => ({
    query: (text: string, params?: unknown[]) => mockQuery(text, params),
}));

import { GET } from "@/app/api/search/popular/route";
import { NextRequest } from "next/server";

function makeRequest(params: Record<string, string> = {}): NextRequest {
    const url = new URL("http://localhost:3000/api/search/popular");
    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
    }
    return new NextRequest(url.toString(), { method: "GET" });
}

beforeEach(() => {
    jest.clearAllMocks();
});

// Helper: first call returns popular works, second returns tags
function mockPopularWithTags(
    works: Record<string, unknown>[],
    tagRows: Record<string, unknown>[] = []
) {
    mockQuery
        .mockResolvedValueOnce({ rows: works })   // getPopularWorks
        .mockResolvedValueOnce({ rows: tagRows }); // getTagsForWorks
}

describe("GET /api/search/popular", () => {
    it("returns popular works with checkout counts and tags", async () => {
        const works = [
            { id: "1", title: "Popular Book", checkout_count: 10 },
            { id: "2", title: "Less Popular", checkout_count: 3 },
        ];
        mockPopularWithTags(works);

        const res = await GET(makeRequest());
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual([
            { id: "1", title: "Popular Book", checkout_count: 10, tags: [] },
            { id: "2", title: "Less Popular", checkout_count: 3, tags: [] },
        ]);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("COALESCE(COUNT(c.id)"),
            undefined
        );
    });

    it("includes tags on returned popular works", async () => {
        const works = [{ id: "1", title: "Popular Book", checkout_count: 5 }];
        const tagRows = [
            { work_id: "1", id: "t1", name: "Fiction", color: "#ff0000", created_at: "x", updated_at: "x" },
        ];
        mockPopularWithTags(works, tagRows);

        const res = await GET(makeRequest());
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body[0].tags).toEqual([
            { id: "t1", name: "Fiction", color: "#ff0000", created_at: "x", updated_at: "x" },
        ]);
    });

    it("passes tag filter to getPopularWorks when tag param is set", async () => {
        mockPopularWithTags([{ id: "1", title: "Tagged Popular", checkout_count: 7 }]);

        const res = await GET(makeRequest({ tag: "tag-uuid-1" }));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toHaveLength(1);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("JOIN work_tags"),
            ["tag-uuid-1"]
        );
    });

    it("returns empty array when no works are popular", async () => {
        mockPopularWithTags([]);

        const res = await GET(makeRequest());
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual([]);
    });

    it("trims whitespace from tag param", async () => {
        mockPopularWithTags([]);

        await GET(makeRequest({ tag: "  tag-uuid-1  " }));

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("JOIN work_tags"),
            ["tag-uuid-1"]
        );
    });

    it("ignores empty tag string", async () => {
        mockPopularWithTags([]);

        await GET(makeRequest({ tag: "   " }));

        expect(mockQuery).toHaveBeenCalledWith(
            expect.not.stringContaining("JOIN work_tags"),
            undefined
        );
    });
});
