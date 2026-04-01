"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RecommendationItem {
    id: string;
    title: string;
    media_type: string | null;
    publisher: string | null;
    has_cover: boolean;
    updated_at: string;
    avg_rating: number | null;
    tag_overlap_count: number;
    recommendation_source: "tags" | "top_rated";
}

interface RecommendationsResponse {
    results: RecommendationItem[];
    source: "tags" | "top_rated";
}

export function RecommendationsSection() {
    const [data, setData] = useState<RecommendationsResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/recommendations")
            .then((res) => res.json())
            .then((json: RecommendationsResponse) => setData(json))
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="mb-10">
                <div className="h-6 w-48 bg-muted rounded animate-pulse mb-1" />
                <div className="h-4 w-64 bg-muted rounded animate-pulse mb-4" />
                <div className="grid gap-3 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <div key={i} className="rounded-lg border bg-card overflow-hidden">
                            <div className="aspect-[3/4] bg-muted animate-pulse" />
                            <div className="p-2 space-y-1">
                                <div className="h-3 bg-muted rounded animate-pulse" />
                                <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!data || data.results.length === 0) {
        return null;
    }

    const subtitle =
        data.source === "tags"
            ? "Based on your reading history"
            : "Highly rated in our collection";

    return (
        <div className="mb-10">
            <h2 className="text-xl font-semibold mb-0.5">Recommended for You</h2>
            <p className="text-sm text-muted-foreground mb-4">{subtitle}</p>
            <div className="grid gap-3 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
                {data.results.map((item) => (
                    <Link
                        key={item.id}
                        href={`/works/${item.id}?from=home`}
                        className="group block rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-ring overflow-hidden"
                    >
                        {/* Cover */}
                        <div className="aspect-[3/4] relative bg-muted">
                            {item.has_cover ? (
                                <img
                                    src={`/api/works/${item.id}/cover?v=${item.updated_at}`}
                                    alt=""
                                    className="absolute inset-0 w-full h-full object-cover"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                    <BookOpen className="h-8 w-8 opacity-30" />
                                </div>
                            )}
                        </div>

                        {/* Details */}
                        <div className="p-2 space-y-0.5">
                            <h3 className="font-semibold text-xs leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                                {item.title}
                            </h3>
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {item.media_type && (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                        {item.media_type.charAt(0).toUpperCase() +
                                            item.media_type.slice(1)}
                                    </Badge>
                                )}
                            </div>
                            {item.avg_rating != null && (
                                <div className="flex items-center gap-1">
                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                    <span className="text-xs text-muted-foreground">
                                        {item.avg_rating.toFixed(1)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
