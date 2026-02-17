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

describe("GET /api/search/works", () => {
    it("returns all works when no query params", async () => {
        const works = [
            { id: "1", title: "Book A" },
            { id: "2", title: "Book B" },
        ];
        mockQuery.mockResolvedValue({ rows: works });

        const res = await GET(makeRequest());
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual(works);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("SELECT"),
            undefined
        );
    });

    it("filters by search query", async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: "1", title: "Gatsby" }] });

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
        mockQuery.mockResolvedValue({ rows: [{ id: "1", title: "E-Book" }] });

        const res = await GET(makeRequest({ media_type: "ebook" }));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toHaveLength(1);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("media_type = $1"),
            ["ebook"]
        );
    });

    it("combines search query and media type filter", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const res = await GET(makeRequest({ q: "history", media_type: "book" }));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual([]);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("ILIKE"),
            ["%history%", "book"]
        );
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("media_type = $2"),
            ["%history%", "book"]
        );
    });

    it("returns empty array when no matches", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const res = await GET(makeRequest({ q: "nonexistent" }));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual([]);
    });

    it("trims whitespace from query params", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await GET(makeRequest({ q: "  gatsby  " }));

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("ILIKE"),
            ["%gatsby%"]
        );
    });

    it("ignores empty query string", async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await GET(makeRequest({ q: "   " }));

        expect(mockQuery).toHaveBeenCalledWith(
            expect.not.stringContaining("ILIKE"),
            undefined
        );
    });
});
