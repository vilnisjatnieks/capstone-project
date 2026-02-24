// ---------------------------------------------------------------------------
// ISBN Lookup Utility
// Fetches book metadata by ISBN from Google Books (primary) with Open Library
// as a fallback. No DB or auth concerns — pure data fetching + normalisation.
// ---------------------------------------------------------------------------

export interface LookupResult {
    title: string;
    publisher: string | null;
    date_published: string | null;
    isbn_10: string | null;
    isbn_13: string | null;
    lccn: string | null;
    number_of_pages: number | null;
    language: string | null;
    media_type: string | null;
    call_number: string | null;
}

// ---------------------------------------------------------------------------
// Language helpers
// ---------------------------------------------------------------------------

const LANGUAGE_MAP: Record<string, string> = {
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    ru: "Russian",
    zh: "Chinese",
    ja: "Japanese",
    ko: "Korean",
    ar: "Arabic",
    hi: "Hindi",
    nl: "Dutch",
    sv: "Swedish",
    pl: "Polish",
    tr: "Turkish",
    vi: "Vietnamese",
    th: "Thai",
    cs: "Czech",
    da: "Danish",
    fi: "Finnish",
    el: "Greek",
    he: "Hebrew",
    hu: "Hungarian",
    id: "Indonesian",
    ms: "Malay",
    no: "Norwegian",
    ro: "Romanian",
    uk: "Ukrainian",
    la: "Latin",
};

export function mapLanguageCode(code: string | undefined): string | null {
    if (!code) return null;
    return LANGUAGE_MAP[code.toLowerCase()] ?? code;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const ISBN_10_RE = /^[0-9]{9}[0-9Xx]$/;
const ISBN_13_RE = /^[0-9]{13}$/;

export function sanitizeISBN(raw: string): string {
    return raw.replace(/[-\s]/g, "").trim();
}

export function isValidISBN(isbn: string): boolean {
    return ISBN_10_RE.test(isbn) || ISBN_13_RE.test(isbn);
}

// ---------------------------------------------------------------------------
// Google Books
// ---------------------------------------------------------------------------

interface GoogleVolumeInfo {
    title?: string;
    publisher?: string;
    publishedDate?: string;
    industryIdentifiers?: { type: string; identifier: string }[];
    pageCount?: number;
    language?: string;
    printType?: string;
}

interface GoogleBooksResponse {
    totalItems?: number;
    items?: { volumeInfo: GoogleVolumeInfo }[];
}

export function parseGoogleResult(info: GoogleVolumeInfo): LookupResult {
    const isbn10 =
        info.industryIdentifiers?.find((id) => id.type === "ISBN_10")
            ?.identifier ?? null;
    const isbn13 =
        info.industryIdentifiers?.find((id) => id.type === "ISBN_13")
            ?.identifier ?? null;

    let mediaType: string | null = null;
    if (info.printType) {
        mediaType = info.printType === "BOOK" ? "book" : info.printType.toLowerCase();
    }

    return {
        title: info.title ?? "Unknown Title",
        publisher: info.publisher ?? null,
        date_published: info.publishedDate ?? null,
        isbn_10: isbn10,
        isbn_13: isbn13,
        lccn: null, // Google Books rarely provides LCCN in a predictable format
        number_of_pages: info.pageCount ?? null,
        language: mapLanguageCode(info.language),
        media_type: mediaType,
        call_number: null, // Google Books does not provide LC call numbers
    };
}

export async function fetchFromGoogle(isbn: string): Promise<LookupResult | null> {
    const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;
    const res = await fetch(url);

    if (!res.ok) {
        return null;
    }

    const data: GoogleBooksResponse = await res.json();
    if (!data.items || data.items.length === 0) {
        return null;
    }

    return parseGoogleResult(data.items[0].volumeInfo);
}

// ---------------------------------------------------------------------------
// Open Library
// ---------------------------------------------------------------------------

interface OpenLibraryBook {
    title?: string;
    publishers?: { name: string }[];
    publish_date?: string;
    number_of_pages?: number;
    identifiers?: {
        isbn_10?: string[];
        isbn_13?: string[];
        lccn?: string[];
    };
    classifications?: {
        lc_classifications?: string[];
    };
}

type OpenLibraryResponse = Record<string, OpenLibraryBook>;

export function parseOpenLibraryResult(book: OpenLibraryBook): LookupResult {
    return {
        title: book.title ?? "Unknown Title",
        publisher: book.publishers?.[0]?.name ?? null,
        date_published: book.publish_date ?? null,
        isbn_10: book.identifiers?.isbn_10?.[0] ?? null,
        isbn_13: book.identifiers?.isbn_13?.[0] ?? null,
        lccn: book.identifiers?.lccn?.[0] ?? null,
        number_of_pages: book.number_of_pages ?? null,
        language: null,
        media_type: "book",
        call_number: book.classifications?.lc_classifications?.[0] ?? null,
    };
}

export async function fetchFromOpenLibrary(isbn: string): Promise<LookupResult | null> {
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
    const res = await fetch(url);

    if (!res.ok) {
        return null;
    }

    const data: OpenLibraryResponse = await res.json();
    const key = Object.keys(data)[0];
    if (!key) {
        return null;
    }

    return parseOpenLibraryResult(data[key]);
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function lookupByISBN(raw: string): Promise<LookupResult> {
    const isbn = sanitizeISBN(raw);

    if (!isbn) {
        throw new Error("ISBN is required");
    }

    if (!isValidISBN(isbn)) {
        throw new Error(`Invalid ISBN: ${isbn}`);
    }

    let result: LookupResult | null = null;

    // Try Google Books first
    try {
        result = await fetchFromGoogle(isbn);
    } catch {
        // Google failed — fall through to Open Library
    }

    // Fallback to Open Library
    if (!result) {
        try {
            result = await fetchFromOpenLibrary(isbn);
        } catch {
            // Open Library also failed
        }
    }

    if (!result) {
        throw new Error(`No results found for ISBN ${isbn}`);
    }

    // Backfill: ensure the entered ISBN populates its own field
    if (isbn.length === 10 && !result.isbn_10) {
        result.isbn_10 = isbn;
    } else if (isbn.length === 13 && !result.isbn_13) {
        result.isbn_13 = isbn;
    }

    return result;
}
