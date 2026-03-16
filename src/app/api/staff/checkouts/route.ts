import { NextRequest, NextResponse } from "next/server";
import { getAllCheckouts, createCheckout } from "@/lib/data/checkouts";

export async function GET() {
    try {
        const checkouts = await getAllCheckouts();
        return NextResponse.json(checkouts);
    } catch (error) {
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
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { work_id, user_id, due_date } = body;

        if (!work_id || !user_id || !due_date) {
            return NextResponse.json(
                { error: "work_id, user_id, and due_date are required" },
                { status: 400 }
            );
        }

        const checkout = await createCheckout({ work_id, user_id, due_date });
        return NextResponse.json(checkout, { status: 201 });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Internal server error";

        if (message === "Unauthorized") {
            return NextResponse.json({ error: message }, { status: 401 });
        }
        if (message === "Forbidden") {
            return NextResponse.json({ error: message }, { status: 403 });
        }
        if (message === "Work not found" || message === "User not found") {
            return NextResponse.json({ error: message }, { status: 404 });
        }
        if (message === "This work is already checked out") {
            return NextResponse.json({ error: message }, { status: 409 });
        }
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
