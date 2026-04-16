import { NextRequest, NextResponse } from "next/server";
import { getPopularWorks } from "@/lib/data/checkouts";
import { getTagsForWorks } from "@/lib/data/tags";
import { parsePageParams, buildPaginatedResponse } from "@/lib/pagination";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get("tag")?.trim() || "";
    const q = searchParams.get("q")?.trim() || "";
    const mediaType = searchParams.get("media_type")?.trim() || "";
    const language = searchParams.get("lang")?.trim() || "";
    const pagination = parsePageParams(searchParams, 25);

    const { rows: works, total } = await getPopularWorks(pagination, {
        tagId: tagId || undefined,
        q: q || undefined,
        mediaType: mediaType || undefined,
        language: language || undefined,
    });

    const workIds = works.map((w) => w.id);
    const tagsMap = await getTagsForWorks(workIds);

    const worksWithTags = works.map((w) => ({
        ...w,
        tags: tagsMap[w.id] || [],
    }));

    return NextResponse.json(
        buildPaginatedResponse(worksWithTags, total, pagination)
    );
}
