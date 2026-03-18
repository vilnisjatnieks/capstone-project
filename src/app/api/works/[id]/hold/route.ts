import { NextRequest, NextResponse } from "next/server";
import {
    getHoldForWork,
    createHold,
    deleteHold,
} from "@/lib/data/holds";

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;
        const hold = await getHoldForWork(id);
        return NextResponse.json({ hold });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Internal server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;
        const hold = await createHold(id);
        return NextResponse.json({ hold }, { status: 201 });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Internal server error";
        if (message === "Unauthorized") {
            return NextResponse.json({ error: message }, { status: 401 });
        }
        if (message === "Work not found") {
            return NextResponse.json({ error: message }, { status: 404 });
        }
        if (
            message === "This work is already on hold" ||
            message === "You already have a work on hold"
        ) {
            return NextResponse.json({ error: message }, { status: 409 });
        }
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;
        await deleteHold(id);
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Internal server error";
        if (message === "Unauthorized") {
            return NextResponse.json({ error: message }, { status: 401 });
        }
        if (message === "Forbidden") {
            return NextResponse.json({ error: message }, { status: 403 });
        }
        if (message === "Hold not found") {
            return NextResponse.json({ error: message }, { status: 404 });
        }
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
