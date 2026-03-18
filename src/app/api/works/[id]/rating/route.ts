import { NextRequest, NextResponse } from "next/server";
import {
    getUserRatingForWork,
    upsertRating,
    deleteRating,
} from "@/lib/data/ratings";
import { getCurrentUser } from "@/lib/auth";

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ rating: null });
        }

        const rating = await getUserRatingForWork(user.id, id);
        return NextResponse.json({ rating });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Internal server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;
        const body = await request.json();

        const rating = await upsertRating(id, body.rating);
        return NextResponse.json({ rating });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Internal server error";
        if (message === "Unauthorized") {
            return NextResponse.json({ error: message }, { status: 401 });
        }
        if (message === "Rating must be between 1 and 5") {
            return NextResponse.json({ error: message }, { status: 400 });
        }
        if (
            message ===
            "You must check out and return this book before rating it"
        ) {
            return NextResponse.json({ error: message }, { status: 403 });
        }
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;
        const deleted = await deleteRating(id);

        if (!deleted) {
            return NextResponse.json(
                { error: "Rating not found" },
                { status: 404 }
            );
        }
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Internal server error";
        if (message === "Unauthorized") {
            return NextResponse.json({ error: message }, { status: 401 });
        }
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
