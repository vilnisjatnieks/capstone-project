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
        `SELECT c.id, c.work_id, c.user_id, c.checked_out_at, c.due_date,
                c.returned_at, c.created_at, c.updated_at,
                w.title AS work_title,
                u.name AS user_name, u.email AS user_email
         FROM checkouts c
         JOIN works w ON w.id = c.work_id
         JOIN users u ON u.id = c.user_id
         WHERE c.id = $1`,
        [id]
    );

    if (result.rows.length === 0) {
        return NextResponse.json({ error: "Checkout not found" }, { status: 404 });
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
    const { action } = body;

    if (action === "return") {
        const result = await query(
            `UPDATE checkouts SET returned_at = NOW(), updated_at = NOW()
             WHERE id = $1 AND returned_at IS NULL
             RETURNING id, work_id, user_id, checked_out_at, due_date, returned_at,
                       created_at, updated_at`,
            [id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: "Checkout not found or already returned" },
                { status: 404 }
            );
        }

        return NextResponse.json(result.rows[0]);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
