import { NextRequest, NextResponse } from "next/server";
import { getTagById, updateTag, deleteTag } from "@/lib/data/tags";

function mapErrorToResponse(error: unknown): NextResponse {
    const message =
        error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") {
        return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message === "Forbidden") {
        return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message === "At least one field is required") {
        return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message === "Tag name already exists") {
        return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
}

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const tag = await getTagById(id);

        if (!tag) {
            return NextResponse.json({ error: "Tag not found" }, { status: 404 });
        }

        return NextResponse.json(tag);
    } catch (error) {
        return mapErrorToResponse(error);
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const tag = await updateTag(id, body);

        if (!tag) {
            return NextResponse.json(
                { error: "Tag not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(tag);
    } catch (error) {
        return mapErrorToResponse(error);
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const deleted = await deleteTag(id);

        if (!deleted) {
            return NextResponse.json({ error: "Tag not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return mapErrorToResponse(error);
    }
}
