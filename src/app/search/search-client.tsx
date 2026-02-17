"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Work {
    id: string;
    title: string;
    date_published: string | null;
    publisher: string | null;
    editor: string | null;
    lccn: string | null;
    isbn_10: string | null;
    isbn_13: string | null;
    media_type: string | null;
    number_of_pages: number | null;
    language: string | null;
    location: string | null;
}

const MEDIA_TYPES = ["book", "ebook", "audiobook", "periodical", "dvd", "other"];

export function SearchClient() {
    const [query, setQuery] = useState("");
    const [mediaFilter, setMediaFilter] = useState("all");
    const [results, setResults] = useState<Work[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const fetchResults = useCallback(async (q: string, media: string) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (q.trim()) params.set("q", q.trim());
            if (media && media !== "all") params.set("media_type", media);

            const res = await fetch(`/api/search/works?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setResults(data);
            }
        } finally {
            setLoading(false);
            setHasSearched(true);
        }
    }, []);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchResults(query, mediaFilter);
        }, 300);
        return () => clearTimeout(timer);
    }, [query, mediaFilter, fetchResults]);

    return (
        <div className="space-y-6">
            {/* Search controls */}
            <div className="flex flex-col sm:flex-row gap-4">
                <Input
                    id="search-input"
                    placeholder="Search by title, publisher, editor, ISBN, or LCCN..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="flex-1"
                />
                <Select value={mediaFilter} onValueChange={setMediaFilter}>
                    <SelectTrigger id="media-filter" className="w-full sm:w-[180px]">
                        <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {MEDIA_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Loading state */}
            {loading && (
                <div className="flex justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
                </div>
            )}

            {/* Results */}
            {!loading && hasSearched && results.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-lg text-muted-foreground">No results found.</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        Try a different search term or remove the media type filter.
                    </p>
                </div>
            )}

            {!loading && results.length > 0 && (
                <>
                    <p className="text-sm text-muted-foreground">
                        {results.length} result{results.length !== 1 ? "s" : ""} found
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {results.map((work) => (
                            <div
                                key={work.id}
                                className="rounded-lg border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between gap-2 mb-3">
                                    <h2 className="font-semibold text-lg leading-tight">
                                        {work.title}
                                    </h2>
                                    {work.media_type && (
                                        <Badge variant="secondary" className="shrink-0">
                                            {work.media_type.charAt(0).toUpperCase() +
                                                work.media_type.slice(1)}
                                        </Badge>
                                    )}
                                </div>

                                <div className="space-y-1 text-sm text-muted-foreground">
                                    {work.publisher && (
                                        <p>
                                            <span className="font-medium text-foreground">Publisher:</span>{" "}
                                            {work.publisher}
                                        </p>
                                    )}
                                    {work.editor && (
                                        <p>
                                            <span className="font-medium text-foreground">Editor:</span>{" "}
                                            {work.editor}
                                        </p>
                                    )}
                                    {work.date_published && (
                                        <p>
                                            <span className="font-medium text-foreground">Published:</span>{" "}
                                            {new Date(work.date_published).toLocaleDateString()}
                                        </p>
                                    )}
                                    {work.language && (
                                        <p>
                                            <span className="font-medium text-foreground">Language:</span>{" "}
                                            {work.language}
                                        </p>
                                    )}
                                    {work.number_of_pages && (
                                        <p>
                                            <span className="font-medium text-foreground">Pages:</span>{" "}
                                            {work.number_of_pages}
                                        </p>
                                    )}
                                    {work.location && (
                                        <p>
                                            <span className="font-medium text-foreground">Location:</span>{" "}
                                            {work.location}
                                        </p>
                                    )}
                                </div>

                                {(work.isbn_10 || work.isbn_13 || work.lccn) && (
                                    <div className="mt-3 pt-3 border-t text-xs text-muted-foreground space-y-0.5">
                                        {work.isbn_10 && <p>ISBN-10: {work.isbn_10}</p>}
                                        {work.isbn_13 && <p>ISBN-13: {work.isbn_13}</p>}
                                        {work.lccn && <p>LCCN: {work.lccn}</p>}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
