import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/staff";
import {
    createAuthor,
    searchAuthors,
    findAuthorByNameCaseInsensitive,
} from "@/lib/data/authors";

export async function GET(request: NextRequest) {
    const check = await requireStaff();
    if (!check.authorized) return check.response;

    const q = request.nextUrl.searchParams.get("q") ?? "";
    try {
        const authors = await searchAuthors(q);
        return NextResponse.json(authors);
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Internal server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const check = await requireStaff();
    if (!check.authorized) return check.response;

    try {
        const body = await request.json();
        if (!body.name || typeof body.name !== "string") {
            return NextResponse.json(
                { error: "Name is required" },
                { status: 400 }
            );
        }
        const existing = await findAuthorByNameCaseInsensitive(body.name);
        if (existing) {
            return NextResponse.json(existing, { status: 200 });
        }
        const author = await createAuthor({
            name: body.name,
            sort_name: body.sort_name ?? null,
        });
        return NextResponse.json(author, { status: 201 });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Internal server error";
        if (message === "Name is required") {
            return NextResponse.json({ error: message }, { status: 400 });
        }
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
