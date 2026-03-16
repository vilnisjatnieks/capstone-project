/**
 * @jest-environment node
 */

const mockRequireStaff = jest.fn();
jest.mock("@/lib/staff", () => ({
    requireStaff: () => mockRequireStaff(),
}));

const mockLookupByISBN = jest.fn();
jest.mock("@/lib/isbn-lookup", () => ({
    lookupByISBN: (isbn: string) => mockLookupByISBN(isbn),
}));

// Mock global fetch for cover image downloads
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

import { GET } from "@/app/api/staff/works/lookup/route";
import { NextRequest } from "next/server";

function makeRequest(isbn?: string): NextRequest {
    const url = isbn
        ? `http://localhost:3000/api/staff/works/lookup?isbn=${encodeURIComponent(isbn)}`
        : "http://localhost:3000/api/staff/works/lookup";
    return new NextRequest(url, { method: "GET" });
}

const staffUser = {
    id: "staff-1",
    email: "staff@example.com",
    name: "Staff",
    role: "staff",
};

beforeEach(() => {
    jest.clearAllMocks();
    mockRequireStaff.mockResolvedValue({ authorized: true, user: staffUser });
});

describe("GET /api/staff/works/lookup", () => {
    it("returns 401 when not authenticated", async () => {
        const { NextResponse } = await import("next/server");
        mockRequireStaff.mockResolvedValue({
            authorized: false,
            response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        });

        const res = await GET(makeRequest("9780140328721"));
        expect(res.status).toBe(401);
    });

    it("returns 403 for non-staff users", async () => {
        const { NextResponse } = await import("next/server");
        mockRequireStaff.mockResolvedValue({
            authorized: false,
            response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
        });

        const res = await GET(makeRequest("9780140328721"));
        expect(res.status).toBe(403);
    });

    it("returns 400 when isbn param is missing", async () => {
        const res = await GET(makeRequest());
        const body = await res.json();
        expect(res.status).toBe(400);
        expect(body.error).toContain("isbn query parameter is required");
    });

    it("returns 400 when isbn is blank", async () => {
        const res = await GET(makeRequest("   "));
        const body = await res.json();
        expect(res.status).toBe(400);
        expect(body.error).toContain("isbn query parameter is required");
    });

    it("returns 200 with book data on success (no cover)", async () => {
        const lookup = {
            title: "Fantastic Mr. Fox",
            publisher: "Puffin",
            date_published: "1988-10-01",
            isbn_10: "0140328726",
            isbn_13: "9780140328721",
            lccn: null,
            number_of_pages: 96,
            language: "English",
            media_type: "book",
            call_number: null,
            cover_url: null,
        };
        mockLookupByISBN.mockResolvedValue(lookup);

        const res = await GET(makeRequest("9780140328721"));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.title).toBe("Fantastic Mr. Fox");
        expect(body.cover).toBeNull();
        expect(body.cover_url).toBeUndefined();
        expect(mockLookupByISBN).toHaveBeenCalledWith("9780140328721");
    });

    it("downloads and returns cover as base64 when cover_url is present", async () => {
        const fakeImageBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
        const lookup = {
            title: "Cover Book",
            publisher: null,
            date_published: null,
            isbn_10: null,
            isbn_13: "9780140328721",
            lccn: null,
            number_of_pages: null,
            language: null,
            media_type: "book",
            call_number: null,
            cover_url: "https://books.google.com/cover.jpg",
        };
        mockLookupByISBN.mockResolvedValue(lookup);
        mockFetch.mockResolvedValueOnce({
            ok: true,
            arrayBuffer: async () => fakeImageBytes.buffer,
        });

        const res = await GET(makeRequest("9780140328721"));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.cover).toBe(Buffer.from(fakeImageBytes).toString("base64"));
        expect(body.cover_url).toBeUndefined();
    });

    it("returns null cover when image download fails", async () => {
        const lookup = {
            title: "No Cover",
            publisher: null,
            date_published: null,
            isbn_10: null,
            isbn_13: "9780140328721",
            lccn: null,
            number_of_pages: null,
            language: null,
            media_type: "book",
            call_number: null,
            cover_url: "https://books.google.com/cover.jpg",
        };
        mockLookupByISBN.mockResolvedValue(lookup);
        mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

        const res = await GET(makeRequest("9780140328721"));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.cover).toBeNull();
    });

    it("returns 400 for invalid ISBN error", async () => {
        mockLookupByISBN.mockRejectedValue(new Error("Invalid ISBN: abc"));

        const res = await GET(makeRequest("abc"));
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(body.error).toContain("Invalid ISBN");
    });

    it("returns 400 for ISBN is required error", async () => {
        mockLookupByISBN.mockRejectedValue(new Error("ISBN is required"));

        const res = await GET(makeRequest("something"));
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(body.error).toBe("ISBN is required");
    });

    it("returns 404 when no results found", async () => {
        mockLookupByISBN.mockRejectedValue(
            new Error("No results found for ISBN 0000000000")
        );

        const res = await GET(makeRequest("0000000000"));
        const body = await res.json();

        expect(res.status).toBe(404);
        expect(body.error).toContain("No results found");
    });

    it("returns 500 on unexpected error", async () => {
        mockLookupByISBN.mockRejectedValue(new Error("Unexpected failure"));

        const res = await GET(makeRequest("9780140328721"));
        const body = await res.json();

        expect(res.status).toBe(500);
        expect(body.error).toBe("Unexpected failure");
    });

    it("returns 500 on non-Error thrown value", async () => {
        mockLookupByISBN.mockRejectedValue("string error");

        const res = await GET(makeRequest("9780140328721"));
        const body = await res.json();

        expect(res.status).toBe(500);
        expect(body.error).toBe("Lookup failed");
    });
});
