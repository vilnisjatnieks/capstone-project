import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireStaff } from "@/lib/staff";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const check = await requireStaff();
    if (!check.authorized) return check.response;

    const { id } = await params;

    const result = await query(
        `SELECT id, created_at, title, date_published, publisher,
            encode(cover, 'base64') as cover,
            editor, lccn, isbn_10, isbn_13, media_type, number_of_pages,
            language, location, updated_at
     FROM works WHERE id = $1`,
        [id]
    );

    if (result.rows.length === 0) {
        return NextResponse.json({ error: "Work not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const check = await requireStaff();
    if (!check.authorized) return check.response;

    const { id } = await params;
    const body = await request.json();
    const {
        title,
        date_published,
        publisher,
        cover,
        editor,
        lccn,
        isbn_10,
        isbn_13,
        media_type,
        number_of_pages,
        language,
        location,
    } = body;

    const updatableFields: Record<string, unknown> = {
        title,
        date_published,
        publisher,
        editor,
        lccn,
        isbn_10,
        isbn_13,
        media_type,
        number_of_pages,
        language,
        location,
    };

    // Handle cover separately since it needs base64 decoding
    if (cover !== undefined) {
        updatableFields.cover = cover ? Buffer.from(cover, "base64") : null;
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updatableFields)) {
        if (value !== undefined) {
            fields.push(`${key} = $${paramIndex++}`);
            values.push(value);
        }
    }

    if (fields.length === 0) {
        return NextResponse.json(
            { error: "At least one field is required" },
            { status: 400 }
        );
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
        `UPDATE works SET ${fields.join(", ")} WHERE id = $${paramIndex}
     RETURNING id, created_at, title, date_published, publisher, editor,
               lccn, isbn_10, isbn_13, media_type, number_of_pages, language,
               location, updated_at`,
        values
    );

    if (result.rows.length === 0) {
        return NextResponse.json({ error: "Work not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const check = await requireStaff();
    if (!check.authorized) return check.response;

    const { id } = await params;

    const result = await query(
        "DELETE FROM works WHERE id = $1 RETURNING id",
        [id]
    );

    if (result.rows.length === 0) {
        return NextResponse.json({ error: "Work not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
}
