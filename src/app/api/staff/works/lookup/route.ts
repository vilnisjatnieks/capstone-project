import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/staff";
import { lookupByISBN } from "@/lib/isbn-lookup";

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
        return NextResponse.json(result);
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
