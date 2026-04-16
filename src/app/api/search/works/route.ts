import { NextRequest, NextResponse } from "next/server";
import { searchWorks, type SearchSortField } from "@/lib/data/works";
import { getTagsForWorks } from "@/lib/data/tags";
import { getWorkRatingSummaries } from "@/lib/data/ratings";
import { parsePageParams } from "@/lib/pagination";

const ALLOWED_SORTS: SearchSortField[] = [
    "title",
    "call_number",
    "date_published",
    "media_type",
    "number_of_pages",
];

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const mediaType = searchParams.get("media_type")?.trim() || "";
    const tagId = searchParams.get("tag")?.trim() || "";
    const language = searchParams.get("lang")?.trim() || "";
    const rawSort = searchParams.get("sort")?.trim() || "";
    const rawDir = searchParams.get("dir")?.trim() || "";
    const sort = (ALLOWED_SORTS as string[]).includes(rawSort)
        ? (rawSort as SearchSortField)
        : "title";
    const dir = rawDir === "desc" ? "desc" : "asc";

    const pagination = parsePageParams(searchParams, 25);

    const { rows: works, total, languages } = await searchWorks(
        {
            q: q || undefined,
            mediaType: mediaType || undefined,
            tagId: tagId || undefined,
            language: language || undefined,
            sort,
            dir,
        },
        pagination
    );

    const workIds = works.map((w) => w.id);
    const [tagsMap, ratingsMap] = await Promise.all([
        getTagsForWorks(workIds),
        getWorkRatingSummaries(workIds),
    ]);

    const items = works.map((w) => ({
        ...w,
        tags: tagsMap[w.id] || [],
        average_rating: ratingsMap[w.id]?.average_rating ?? null,
        rating_count: ratingsMap[w.id]?.rating_count ?? 0,
    }));

    return NextResponse.json({
        items,
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
        languages,
    });
}
