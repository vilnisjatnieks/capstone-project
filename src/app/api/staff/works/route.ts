import { NextRequest, NextResponse } from "next/server";
import { getAllWorks, createWork } from "@/lib/data/works";
import { parsePageParams, buildPaginatedResponse } from "@/lib/pagination";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const params = parsePageParams(searchParams, 20);
        const { rows, total } = await getAllWorks(params);
        return NextResponse.json(buildPaginatedResponse(rows, total, params));
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

        if (!body.title) {
            return NextResponse.json(
                { error: "Title is required" },
                { status: 400 }
            );
        }

        const work = await createWork(body);
        return NextResponse.json(work, { status: 201 });
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
