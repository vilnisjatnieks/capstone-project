import { NextRequest, NextResponse } from "next/server";
import { getCheckoutById, returnCheckout } from "@/lib/data/checkouts";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const checkout = await getCheckoutById(id);

        if (!checkout) {
            return NextResponse.json(
                { error: "Checkout not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(checkout);
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

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { action } = body;

        if (action === "return") {
            const checkout = await returnCheckout(id);

            if (!checkout) {
                return NextResponse.json(
                    { error: "Checkout not found or already returned" },
                    { status: 404 }
                );
            }

            return NextResponse.json(checkout);
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
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
