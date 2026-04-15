/**
 * @jest-environment node
 */

import {
    sanitizeISBN,
    isValidISBN,
    mapLanguageCode,
    parseGoogleResult,
    parseOpenLibraryResult,
    fetchFromGoogle,
    fetchFromOpenLibrary,
    lookupByISBN,
} from "@/lib/isbn-lookup";

// ---------------------------------------------------------------------------
// Mock global fetch
// ---------------------------------------------------------------------------

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

beforeEach(() => {
    jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// sanitizeISBN
// ---------------------------------------------------------------------------

describe("sanitizeISBN", () => {
    it("strips hyphens and spaces", () => {
        expect(sanitizeISBN("978-0-14-032872-1")).toBe("9780140328721");
        expect(sanitizeISBN("0 14 032872 6")).toBe("0140328726");
    });

    it("trims whitespace", () => {
        expect(sanitizeISBN("  9780140328721  ")).toBe("9780140328721");
    });

    it("returns empty string for empty input", () => {
        expect(sanitizeISBN("")).toBe("");
    });
});

// ---------------------------------------------------------------------------
// isValidISBN
// ---------------------------------------------------------------------------

describe("isValidISBN", () => {
    it("accepts valid ISBN-13", () => {
        expect(isValidISBN("9780140328721")).toBe(true);
    });

    it("accepts valid ISBN-10", () => {
        expect(isValidISBN("0140328726")).toBe(true);
    });

    it("accepts ISBN-10 ending in X", () => {
        expect(isValidISBN("012345678X")).toBe(true);
    });

    it("accepts ISBN-10 ending in lowercase x", () => {
        expect(isValidISBN("012345678x")).toBe(true);
    });

    it("rejects too short", () => {
        expect(isValidISBN("12345")).toBe(false);
    });

    it("rejects too long", () => {
        expect(isValidISBN("12345678901234")).toBe(false);
    });

    it("rejects letters in body", () => {
        expect(isValidISBN("01403ABC26")).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// mapLanguageCode
// ---------------------------------------------------------------------------

describe("mapLanguageCode", () => {
    it("maps known codes", () => {
        expect(mapLanguageCode("en")).toBe("English");
        expect(mapLanguageCode("fr")).toBe("French");
        expect(mapLanguageCode("es")).toBe("Spanish");
    });

    it("is case-insensitive", () => {
        expect(mapLanguageCode("EN")).toBe("English");
    });

    it("returns the code itself for unknown codes", () => {
        expect(mapLanguageCode("xx")).toBe("xx");
    });

    it("returns null for undefined", () => {
        expect(mapLanguageCode(undefined)).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// parseGoogleResult
// ---------------------------------------------------------------------------

describe("parseGoogleResult", () => {
    it("parses a full Google volumeInfo", () => {
        const result = parseGoogleResult({
            title: "Fantastic Mr. Fox",
            publisher: "Puffin",
            publishedDate: "1988-10-01",
            industryIdentifiers: [
                { type: "ISBN_10", identifier: "0140328726" },
                { type: "ISBN_13", identifier: "9780140328721" },
            ],
            pageCount: 96,
            language: "en",
            printType: "BOOK",
        });

        expect(result).toEqual({
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
            authors: [],
        });
    });

    it("extracts authors from Google volumeInfo", () => {
        const result = parseGoogleResult({
            title: "Coauthored",
            authors: ["Jane Smith", "John Doe"],
        });
        expect(result.authors).toEqual(["Jane Smith", "John Doe"]);
    });

    it("extracts cover_url from imageLinks", () => {
        const result = parseGoogleResult({
            title: "Cover Book",
            imageLinks: { thumbnail: "http://books.google.com/cover.jpg" },
        });
        expect(result.cover_url).toBe("https://books.google.com/cover.jpg");
    });

    it("handles missing optional fields", () => {
        const result = parseGoogleResult({ title: "Minimal" });
        expect(result).toEqual({
            title: "Minimal",
            publisher: null,
            date_published: null,
            isbn_10: null,
            isbn_13: null,
            lccn: null,
            number_of_pages: null,
            language: null,
            media_type: null,
            call_number: null,
            cover_url: null,
            authors: [],
        });
    });

    it("defaults title to Unknown Title when missing", () => {
        const result = parseGoogleResult({});
        expect(result.title).toBe("Unknown Title");
    });

    it("maps non-BOOK printType to lowercase", () => {
        const result = parseGoogleResult({ printType: "MAGAZINE" });
        expect(result.media_type).toBe("magazine");
    });
});

// ---------------------------------------------------------------------------
// parseOpenLibraryResult
// ---------------------------------------------------------------------------

describe("parseOpenLibraryResult", () => {
    it("parses a full Open Library book", () => {
        const result = parseOpenLibraryResult({
            title: "Fantastic Mr. Fox",
            publishers: [{ name: "Puffin" }],
            publish_date: "October 1, 1988",
            number_of_pages: 96,
            identifiers: {
                isbn_10: ["0140328726"],
                isbn_13: ["9780140328721"],
                lccn: ["94036653"],
            },
            classifications: {
                lc_classifications: ["QA76.64 .D47 1995"],
            },
        });

        expect(result).toEqual({
            title: "Fantastic Mr. Fox",
            publisher: "Puffin",
            date_published: "October 1, 1988",
            isbn_10: "0140328726",
            isbn_13: "9780140328721",
            lccn: "94036653",
            number_of_pages: 96,
            language: null,
            media_type: "book",
            call_number: "QA76.64 .D47 1995",
            cover_url: null,
            authors: [],
        });
    });

    it("extracts authors array from Open Library", () => {
        const result = parseOpenLibraryResult({
            title: "Coauthored",
            authors: [{ name: "Jane Smith" }, { name: "John Doe" }],
        });
        expect(result.authors).toEqual(["Jane Smith", "John Doe"]);
    });

    it("extracts cover_url from cover object", () => {
        const result = parseOpenLibraryResult({
            title: "Cover Book",
            cover: { large: "https://covers.openlibrary.org/large.jpg", medium: "https://covers.openlibrary.org/medium.jpg" },
        });
        expect(result.cover_url).toBe("https://covers.openlibrary.org/large.jpg");
    });

    it("falls back to medium cover when large is missing", () => {
        const result = parseOpenLibraryResult({
            title: "Cover Book",
            cover: { medium: "https://covers.openlibrary.org/medium.jpg" },
        });
        expect(result.cover_url).toBe("https://covers.openlibrary.org/medium.jpg");
    });

    it("handles missing optional fields", () => {
        const result = parseOpenLibraryResult({});
        expect(result).toEqual({
            title: "Unknown Title",
            publisher: null,
            date_published: null,
            isbn_10: null,
            isbn_13: null,
            lccn: null,
            number_of_pages: null,
            language: null,
            media_type: "book",
            call_number: null,
            cover_url: null,
            authors: [],
        });
    });
});

// ---------------------------------------------------------------------------
// fetchFromGoogle
// ---------------------------------------------------------------------------

describe("fetchFromGoogle", () => {
    it("returns parsed result on success", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                totalItems: 1,
                items: [
                    {
                        volumeInfo: {
                            title: "Test Book",
                            publisher: "Test Publisher",
                            language: "en",
                        },
                    },
                ],
            }),
        });

        const result = await fetchFromGoogle("9780140328721");
        expect(result).not.toBeNull();
        expect(result!.title).toBe("Test Book");
        expect(mockFetch).toHaveBeenCalledWith(
            "https://www.googleapis.com/books/v1/volumes?q=isbn:9780140328721"
        );
    });

    it("returns null when response is not ok", async () => {
        mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });
        const result = await fetchFromGoogle("9780140328721");
        expect(result).toBeNull();
    });

    it("returns null when no items", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ totalItems: 0, items: undefined }),
        });
        const result = await fetchFromGoogle("9780140328721");
        expect(result).toBeNull();
    });

    it("returns null when items array is empty", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ totalItems: 0, items: [] }),
        });
        const result = await fetchFromGoogle("9780140328721");
        expect(result).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// fetchFromOpenLibrary
// ---------------------------------------------------------------------------

describe("fetchFromOpenLibrary", () => {
    it("returns parsed result on success", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                "ISBN:9780140328721": {
                    title: "Fantastic Mr. Fox",
                    publishers: [{ name: "Puffin" }],
                },
            }),
        });

        const result = await fetchFromOpenLibrary("9780140328721");
        expect(result).not.toBeNull();
        expect(result!.title).toBe("Fantastic Mr. Fox");
        expect(mockFetch).toHaveBeenCalledWith(
            "https://openlibrary.org/api/books?bibkeys=ISBN:9780140328721&format=json&jscmd=data"
        );
    });

    it("returns null when response is not ok", async () => {
        mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
        const result = await fetchFromOpenLibrary("9780140328721");
        expect(result).toBeNull();
    });

    it("returns null when response is empty object", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({}),
        });
        const result = await fetchFromOpenLibrary("9780140328721");
        expect(result).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// lookupByISBN (integration of the above)
// ---------------------------------------------------------------------------

describe("lookupByISBN", () => {
    it("throws for empty ISBN", async () => {
        await expect(lookupByISBN("")).rejects.toThrow("ISBN is required");
    });

    it("throws for blank ISBN", async () => {
        await expect(lookupByISBN("   ")).rejects.toThrow("ISBN is required");
    });

    it("throws for invalid ISBN", async () => {
        await expect(lookupByISBN("abc")).rejects.toThrow("Invalid ISBN: abc");
    });

    it("returns Google result when available", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                totalItems: 1,
                items: [{ volumeInfo: { title: "From Google" } }],
            }),
        });

        const result = await lookupByISBN("9780140328721");
        expect(result.title).toBe("From Google");
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("falls back to Open Library when Google returns no items", async () => {
        // Google returns empty
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ totalItems: 0 }),
        });
        // Open Library returns data
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                "ISBN:9780140328721": { title: "From OpenLibrary" },
            }),
        });

        const result = await lookupByISBN("9780140328721");
        expect(result.title).toBe("From OpenLibrary");
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("falls back to Open Library when Google fetch throws", async () => {
        mockFetch.mockRejectedValueOnce(new Error("network error"));
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                "ISBN:9780140328721": { title: "From OL after crash" },
            }),
        });

        const result = await lookupByISBN("9780140328721");
        expect(result.title).toBe("From OL after crash");
    });

    it("throws when both APIs fail", async () => {
        mockFetch.mockRejectedValueOnce(new Error("google down"));
        mockFetch.mockRejectedValueOnce(new Error("ol down"));

        await expect(lookupByISBN("9780140328721")).rejects.toThrow(
            "No results found for ISBN 9780140328721"
        );
    });

    it("throws when both APIs return no data", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ totalItems: 0 }),
        });
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({}),
        });

        await expect(lookupByISBN("9780140328721")).rejects.toThrow(
            "No results found for ISBN 9780140328721"
        );
    });

    it("accepts ISBN with hyphens", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                totalItems: 1,
                items: [{ volumeInfo: { title: "Hyphenated" } }],
            }),
        });

        const result = await lookupByISBN("978-0-14-032872-1");
        expect(result.title).toBe("Hyphenated");
    });

    it("accepts ISBN-10 ending in X", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                totalItems: 1,
                items: [{ volumeInfo: { title: "X Book" } }],
            }),
        });

        const result = await lookupByISBN("012345678X");
        expect(result.title).toBe("X Book");
    });

    it("backfills isbn_13 when API only returns isbn_10", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                totalItems: 1,
                items: [{
                    volumeInfo: {
                        title: "Harry Potter",
                        industryIdentifiers: [
                            { type: "ISBN_10", identifier: "0590353427" },
                        ],
                    },
                }],
            }),
        });

        const result = await lookupByISBN("9780590353427");
        expect(result.isbn_10).toBe("0590353427");
        expect(result.isbn_13).toBe("9780590353427");
    });

    it("backfills isbn_10 when API only returns isbn_13", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                totalItems: 1,
                items: [{
                    volumeInfo: {
                        title: "The Hunger Games",
                        industryIdentifiers: [
                            { type: "ISBN_13", identifier: "9780439023481" },
                        ],
                    },
                }],
            }),
        });

        const result = await lookupByISBN("0439023483");
        expect(result.isbn_13).toBe("9780439023481");
        expect(result.isbn_10).toBe("0439023483");
    });

    it("does not overwrite existing isbn fields during backfill", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                totalItems: 1,
                items: [{
                    volumeInfo: {
                        title: "Both ISBNs Present",
                        industryIdentifiers: [
                            { type: "ISBN_10", identifier: "0140328726" },
                            { type: "ISBN_13", identifier: "9780140328721" },
                        ],
                    },
                }],
            }),
        });

        const result = await lookupByISBN("9780140328721");
        expect(result.isbn_10).toBe("0140328726");
        expect(result.isbn_13).toBe("9780140328721");
    });
});
