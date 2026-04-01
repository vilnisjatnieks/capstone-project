import { NextResponse } from "next/server";
import { getPublicTags } from "@/lib/data/tags";

export async function GET() {
    const tags = await getPublicTags();
    return NextResponse.json(tags);
}
