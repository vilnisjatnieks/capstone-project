import { NextRequest, NextResponse } from "next/server";
import { searchWorks } from "@/lib/data/works";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const mediaType = searchParams.get("media_type")?.trim() || "";

    const works = await searchWorks({
        q: q || undefined,
        mediaType: mediaType || undefined,
    });

    return NextResponse.json(works);
}
