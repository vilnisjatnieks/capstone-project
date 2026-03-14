import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/staff";
import { lookupByISBN } from "@/lib/isbn-lookup";

async function fetchCoverAsBase64(url: string): Promise<string | null> {
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) return null;

        const buffer = await res.arrayBuffer();
        if (buffer.byteLength === 0) return null;

        return Buffer.from(buffer).toString("base64");
    } catch {
        return null;
    }
}

export async function GET(request: NextRequest) {
    const check = await requireStaff();
    if (!check.authorized) {
        return check.response;
    }

    const isbn = request.nextUrl.searchParams.get("isbn")?.trim();
    if (!isbn) {
        return NextResponse.json(
            { error: "isbn query parameter is required" },
            { status: 400 }
        );
    }

    try {
        const result = await lookupByISBN(isbn);

        // Download cover image if a URL was found
        let cover: string | null = null;
        if (result.cover_url) {
            cover = await fetchCoverAsBase64(result.cover_url);
        }

        // Return metadata + cover (without cover_url — the client doesn't need it)
        const { cover_url, ...metadata } = result;
        return NextResponse.json({ ...metadata, cover });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Lookup failed";

        if (message.startsWith("Invalid ISBN") || message === "ISBN is required") {
            return NextResponse.json({ error: message }, { status: 400 });
        }

        if (message.startsWith("No results found")) {
            return NextResponse.json({ error: message }, { status: 404 });
        }

        return NextResponse.json({ error: message }, { status: 500 });
    }
}
