import { NextRequest, NextResponse } from "next/server";
import { getWorkById, updateWork, deleteWork } from "@/lib/data/works";

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
    return NextResponse.json({ error: message }, { status: 500 });
}

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const work = await getWorkById(id);

        if (!work) {
            return NextResponse.json({ error: "Work not found" }, { status: 404 });
        }

        return NextResponse.json(work);
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

        const work = await updateWork(id, body);

        if (!work) {
            return NextResponse.json(
                { error: "Work not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(work);
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
        const deleted = await deleteWork(id);

        if (!deleted) {
            return NextResponse.json({ error: "Work not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return mapErrorToResponse(error);
    }
}
