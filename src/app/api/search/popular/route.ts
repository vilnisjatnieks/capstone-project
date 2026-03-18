import { NextRequest, NextResponse } from "next/server";
import { getPopularWorks } from "@/lib/data/checkouts";
import { getTagsForWorks } from "@/lib/data/tags";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get("tag")?.trim() || "";

    const works = await getPopularWorks(tagId || undefined);

    const workIds = works.map((w) => w.id);
    const tagsMap = await getTagsForWorks(workIds);

    const worksWithTags = works.map((w) => ({
        ...w,
        tags: tagsMap[w.id] || [],
    }));

    return NextResponse.json(worksWithTags);
}
