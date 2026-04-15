import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/staff";
import {
    getAuthorWithWorks,
    updateAuthor,
    deleteAuthor,
} from "@/lib/data/authors";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const author = await getAuthorWithWorks(id);
        if (!author) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        return NextResponse.json(author);
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Internal server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const check = await requireStaff();
    if (!check.authorized) return check.response;

    const { id } = await params;
    try {
        const body = await request.json();
        const author = await updateAuthor(id, {
            name: body.name,
            sort_name: body.sort_name,
        });
        if (!author) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        return NextResponse.json(author);
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Internal server error";
        if (/cannot be empty|required/i.test(message)) {
            return NextResponse.json({ error: message }, { status: 400 });
        }
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const check = await requireStaff();
    if (!check.authorized) return check.response;

    const { id } = await params;
    try {
        const ok = await deleteAuthor(id);
        if (!ok) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Internal server error";
        if (message === "Author has attached works") {
            return NextResponse.json({ error: message }, { status: 409 });
        }
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
