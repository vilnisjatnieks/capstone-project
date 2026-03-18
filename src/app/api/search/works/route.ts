import { NextRequest, NextResponse } from "next/server";
import { searchWorks } from "@/lib/data/works";
import { getTagsForWorks } from "@/lib/data/tags";
import { getWorkRatingSummaries } from "@/lib/data/ratings";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const mediaType = searchParams.get("media_type")?.trim() || "";
    const tagId = searchParams.get("tag")?.trim() || "";

    const works = await searchWorks({
        q: q || undefined,
        mediaType: mediaType || undefined,
        tagId: tagId || undefined,
    });

    const workIds = works.map((w) => w.id);
    const [tagsMap, ratingsMap] = await Promise.all([
        getTagsForWorks(workIds),
        getWorkRatingSummaries(workIds),
    ]);

    const worksWithExtras = works.map((w) => ({
        ...w,
        tags: tagsMap[w.id] || [],
        average_rating: ratingsMap[w.id]?.average_rating ?? null,
        rating_count: ratingsMap[w.id]?.rating_count ?? 0,
    }));

    return NextResponse.json(worksWithExtras);
}
