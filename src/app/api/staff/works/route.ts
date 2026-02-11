import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireStaff } from "@/lib/staff";

export async function GET() {
    const check = await requireStaff();
    if (!check.authorized) return check.response;

    const result = await query(
        `SELECT id, created_at, title, date_published, publisher, editor,
            lccn, isbn_10, isbn_13, media_type, number_of_pages, language,
            location, updated_at
     FROM works ORDER BY created_at DESC`
    );

    return NextResponse.json(result.rows);
}

export async function POST(request: NextRequest) {
    const check = await requireStaff();
    if (!check.authorized) return check.response;

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

    if (!title) {
        return NextResponse.json(
            { error: "Title is required" },
            { status: 400 }
        );
    }

    const coverBuffer = cover ? Buffer.from(cover, "base64") : null;

    const result = await query(
        `INSERT INTO works (title, date_published, publisher, cover, editor,
                        lccn, isbn_10, isbn_13, media_type, number_of_pages,
                        language, location)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id, created_at, title, date_published, publisher, editor,
               lccn, isbn_10, isbn_13, media_type, number_of_pages, language,
               location, updated_at`,
        [
            title,
            date_published || null,
            publisher || null,
            coverBuffer,
            editor || null,
            lccn || null,
            isbn_10 || null,
            isbn_13 || null,
            media_type || null,
            number_of_pages || null,
            language || null,
            location || null,
        ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
}
