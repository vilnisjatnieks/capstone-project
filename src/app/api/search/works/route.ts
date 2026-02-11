import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const mediaType = searchParams.get("media_type")?.trim() || "";

    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (q) {
        conditions.push(
            `(title ILIKE $${paramIndex}
              OR publisher ILIKE $${paramIndex}
              OR editor ILIKE $${paramIndex}
              OR isbn_10 ILIKE $${paramIndex}
              OR isbn_13 ILIKE $${paramIndex}
              OR lccn ILIKE $${paramIndex})`
        );
        values.push(`%${q}%`);
        paramIndex++;
    }

    if (mediaType) {
        conditions.push(`media_type = $${paramIndex}`);
        values.push(mediaType);
        paramIndex++;
    }

    const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await query(
        `SELECT id, title, date_published, publisher, editor,
                lccn, isbn_10, isbn_13, media_type, number_of_pages,
                language, location
         FROM works ${whereClause}
         ORDER BY title ASC`,
        values.length > 0 ? values : undefined
    );

    return NextResponse.json(result.rows);
}
