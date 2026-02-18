import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireStaff } from "@/lib/staff";

export async function GET() {
    const check = await requireStaff();
    if (!check.authorized) return check.response;

    const result = await query(
        `SELECT c.id, c.work_id, c.user_id, c.checked_out_at, c.due_date,
                c.returned_at, c.created_at, c.updated_at,
                w.title AS work_title,
                u.name AS user_name, u.email AS user_email
         FROM checkouts c
         JOIN works w ON w.id = c.work_id
         JOIN users u ON u.id = c.user_id
         ORDER BY c.created_at DESC`
    );

    return NextResponse.json(result.rows);
}

export async function POST(request: NextRequest) {
    const check = await requireStaff();
    if (!check.authorized) return check.response;

    const body = await request.json();
    const { work_id, user_id, due_date } = body;

    if (!work_id || !user_id || !due_date) {
        return NextResponse.json(
            { error: "work_id, user_id, and due_date are required" },
            { status: 400 }
        );
    }

    // Check that the work exists
    const workResult = await query("SELECT id FROM works WHERE id = $1", [work_id]);
    if (workResult.rows.length === 0) {
        return NextResponse.json({ error: "Work not found" }, { status: 404 });
    }

    // Check that the user exists
    const userResult = await query("SELECT id FROM users WHERE id = $1", [user_id]);
    if (userResult.rows.length === 0) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check that the work is not already checked out
    const activeCheckout = await query(
        "SELECT id FROM checkouts WHERE work_id = $1 AND returned_at IS NULL",
        [work_id]
    );
    if (activeCheckout.rows.length > 0) {
        return NextResponse.json(
            { error: "This work is already checked out" },
            { status: 409 }
        );
    }

    const result = await query(
        `INSERT INTO checkouts (work_id, user_id, due_date)
         VALUES ($1, $2, $3)
         RETURNING id, work_id, user_id, checked_out_at, due_date, returned_at,
                   created_at, updated_at`,
        [work_id, user_id, due_date]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
}
