import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    const result = await query(
        "SELECT cover FROM works WHERE id = $1",
        [id]
    );

    if (result.rows.length === 0 || !result.rows[0].cover) {
        return new NextResponse(null, { status: 404 });
    }

    const coverBuffer: Buffer = result.rows[0].cover;

    return new NextResponse(coverBuffer, {
        headers: {
            "Content-Type": "image/jpeg",
            "Cache-Control": "public, max-age=86400",
        },
    });
}
