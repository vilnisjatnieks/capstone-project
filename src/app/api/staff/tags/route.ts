import { NextRequest, NextResponse } from "next/server";
import { getAllTags, createTag } from "@/lib/data/tags";

export async function GET() {
    try {
        const tags = await getAllTags();
        return NextResponse.json(tags);
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Internal server error";
        if (message === "Unauthorized") {
            return NextResponse.json({ error: message }, { status: 401 });
        }
        if (message === "Forbidden") {
            return NextResponse.json({ error: message }, { status: 403 });
        }
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.name) {
            return NextResponse.json(
                { error: "Name is required" },
                { status: 400 }
            );
        }

        const tag = await createTag(body);
        return NextResponse.json(tag, { status: 201 });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Internal server error";
        if (message === "Unauthorized") {
            return NextResponse.json({ error: message }, { status: 401 });
        }
        if (message === "Forbidden") {
            return NextResponse.json({ error: message }, { status: 403 });
        }
        if (message === "Tag name already exists") {
            return NextResponse.json({ error: message }, { status: 409 });
        }
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
