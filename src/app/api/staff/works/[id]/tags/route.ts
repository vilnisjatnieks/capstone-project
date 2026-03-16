import { NextRequest, NextResponse } from "next/server";
import { getTagsForWork, addTagToWork, removeTagFromWork } from "@/lib/data/tags";

function mapErrorToResponse(error: unknown): NextResponse {
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

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const tags = await getTagsForWork(id);
        return NextResponse.json(tags);
    } catch (error) {
        return mapErrorToResponse(error);
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        if (!body.tag_id) {
            return NextResponse.json(
                { error: "tag_id is required" },
                { status: 400 }
            );
        }

        await addTagToWork(id, body.tag_id);
        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error) {
        return mapErrorToResponse(error);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        if (!body.tag_id) {
            return NextResponse.json(
                { error: "tag_id is required" },
                { status: 400 }
            );
        }

        const removed = await removeTagFromWork(id, body.tag_id);

        if (!removed) {
            return NextResponse.json(
                { error: "Tag assignment not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return mapErrorToResponse(error);
    }
}
