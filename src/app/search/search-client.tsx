"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PaginationControls } from "@/components/pagination-controls";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    LayoutGrid,
    List,
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
    Search,
    BookOpen,
    TrendingUp,
    Star,
} from "lucide-react";

interface WorkTag {
    id: string;
    name: string;
    color: string | null;
}

interface WorkAuthor {
    id: string;
    name: string;
    sort_name: string | null;
    role: string;
    position: number;
}

interface Work {
    id: string;
    title: string;
    date_published: string | null;
    publisher: string | null;
    authors: WorkAuthor[];
    lccn: string | null;
    isbn_10: string | null;
    isbn_13: string | null;
    media_type: string | null;
    number_of_pages: number | null;
    language: string | null;
    location: string | null;
    call_number: string | null;
    tags?: WorkTag[];
    has_cover: boolean;
    updated_at: string;
    checkout_count?: number;
    average_rating: number | null;
    rating_count: number;
}

type ViewMode = "grid" | "list";
type SortField =
    | "title"
    | "call_number"
    | "date_published"
    | "media_type"
    | "number_of_pages"
    | "popularity"
    | "average_rating";
type SortDirection = "asc" | "desc";

const MEDIA_TYPES = ["book", "ebook", "audiobook", "periodical", "dvd", "other"];

const SORT_FIELD_LABELS: Record<SortField, string> = {
    title: "Title",
    call_number: "Call Number",
    date_published: "Date Published",
    media_type: "Media Type",
    number_of_pages: "Pages",
    popularity: "Most Popular",
    average_rating: "Rating",
};

function extractYear(date: string): string {
    const match = date.match(/(\d{4})/);
    return match ? match[1] : date;
}

const PAGE_SIZE = 25;

interface Tag {
    id: string;
    name: string;
    color: string | null;
}

export function SearchClient({ initialQuery = "" }: { initialQuery?: string }) {
    const [query, setQuery] = useState(initialQuery);
    const [mediaFilter, setMediaFilter] = useState("all");
    const [tagFilter, setTagFilter] = useState("all");
    const [results, setResults] = useState<Work[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [availableTags, setAvailableTags] = useState<Tag[]>([]);

    // New state
    const [viewMode, setViewMode] = useState<ViewMode>("grid");
    const [sortField, setSortField] = useState<SortField>("title");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
    const [languageFilter, setLanguageFilter] = useState("all");

    const router = useRouter();

    // Fetch tags once on mount
    useEffect(() => {
        fetch("/api/search/tags")
            .then((res) => (res.ok ? res.json() : []))
            .then((data) => setAvailableTags(data))
            .catch(() => {});
    }, []);

    const fetchResults = useCallback(async (
        q: string,
        media: string,
        tag: string,
        lang: string,
        sort: SortField,
        dir: SortDirection,
        targetPage: number
    ) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set("page", String(targetPage));
            params.set("pageSize", String(PAGE_SIZE));
            if (q.trim()) params.set("q", q.trim());
            if (media && media !== "all") params.set("media_type", media);
            if (tag && tag !== "all") params.set("tag", tag);
            if (lang && lang !== "all") params.set("lang", lang);
            if (sort === "popularity") {
                const res = await fetch(`/api/search/popular?${params.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    setResults(data.items);
                    setTotal(data.total);
                    // Popular endpoint has no languages — keep previous list
                }
            } else {
                params.set("sort", sort);
                params.set("dir", dir);
                const res = await fetch(`/api/search/works?${params.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    setResults(data.items);
                    setTotal(data.total);
                    if (Array.isArray(data.languages)) {
                        setAvailableLanguages(data.languages);
                    }
                }
            }
        } finally {
            setLoading(false);
            setHasSearched(true);
        }
    }, []);

    // Reset to page 1 whenever filters/sort change
    useEffect(() => {
        setPage(1);
    }, [query, mediaFilter, tagFilter, languageFilter, sortField, sortDirection]);

    // Debounced fetch
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchResults(query, mediaFilter, tagFilter, languageFilter, sortField, sortDirection, page);
        }, 300);
        return () => clearTimeout(timer);
    }, [query, mediaFilter, tagFilter, languageFilter, sortField, sortDirection, page, fetchResults]);

    // Build return URL encoding current filter state (for "Back to Search" on work pages)
    const searchReturnUrl = useMemo(() => {
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        if (mediaFilter !== "all") params.set("media", mediaFilter);
        if (tagFilter !== "all") params.set("tag", tagFilter);
        if (languageFilter !== "all") params.set("lang", languageFilter);
        if (sortField !== "title") params.set("sort", sortField);
        if (sortDirection !== "asc") params.set("dir", sortDirection);
        if (viewMode !== "grid") params.set("view", viewMode);
        const qs = params.toString();
        return `/search${qs ? "?" + qs : ""}`;
    }, [query, mediaFilter, tagFilter, languageFilter, sortField, sortDirection, viewMode]);

    const processedResults = results;

    function handleColumnSort(field: SortField) {
        if (sortField === field) {
            setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    }

    function renderSortIcon(field: SortField) {
        if (sortField !== field) {
            return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
        }
        return sortDirection === "asc" ? (
            <ArrowUp className="ml-1 h-3 w-3" />
        ) : (
            <ArrowDown className="ml-1 h-3 w-3" />
        );
    }

    return (
        <div className="space-y-6">
            {/* Search controls */}
            <div className="flex flex-col gap-4">
                {/* Row 1: Search input */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="search-input"
                        placeholder="Search by title, publisher, author, ISBN, or LCCN..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {/* Row 2: Filters, sort, and view toggle */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Media type filter */}
                    <Select value={mediaFilter} onValueChange={setMediaFilter}>
                        <SelectTrigger id="media-filter" className="w-[160px]">
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

                    {/* Language filter */}
                    <Select value={languageFilter} onValueChange={setLanguageFilter}>
                        <SelectTrigger id="language-filter" className="w-[160px]">
                            <SelectValue placeholder="All Languages" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Languages</SelectItem>
                            {availableLanguages.map((lang) => (
                                <SelectItem key={lang} value={lang}>
                                    {lang}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Tag filter */}
                    {availableTags.length > 0 && (
                        <Select value={tagFilter} onValueChange={setTagFilter}>
                            <SelectTrigger id="tag-filter" className="w-[160px]">
                                <SelectValue placeholder="All Tags" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Tags</SelectItem>
                                {availableTags.map((tag) => (
                                    <SelectItem key={tag.id} value={tag.id}>
                                        <div className="flex items-center gap-2">
                                            {tag.color && (
                                                <div
                                                    className="w-3 h-3 rounded-full border"
                                                    style={{ backgroundColor: tag.color }}
                                                />
                                            )}
                                            {tag.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {/* Sort field */}
                    <Select
                        value={sortField}
                        onValueChange={(v) => setSortField(v as SortField)}
                    >
                        <SelectTrigger id="sort-field" className="w-[170px]">
                            <SelectValue placeholder="Sort by..." />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(SORT_FIELD_LABELS).map(
                                ([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                )
                            )}
                        </SelectContent>
                    </Select>

                    {/* Sort direction */}
                    <Button
                        id="sort-direction"
                        variant="outline"
                        size="icon"
                        onClick={() =>
                            setSortDirection((d) =>
                                d === "asc" ? "desc" : "asc"
                            )
                        }
                        title={
                            sortDirection === "asc"
                                ? "Ascending — click to reverse"
                                : "Descending — click to reverse"
                        }
                    >
                        {sortDirection === "asc" ? (
                            <ArrowUp className="h-4 w-4" />
                        ) : (
                            <ArrowDown className="h-4 w-4" />
                        )}
                    </Button>

                    {/* Spacer pushes view toggle to the right */}
                    <div className="flex-1" />

                    {/* View toggle */}
                    <div className="flex rounded-md border">
                        <Button
                            id="view-grid"
                            variant={viewMode === "grid" ? "default" : "ghost"}
                            size="icon"
                            className="rounded-r-none"
                            onClick={() => setViewMode("grid")}
                            title="Grid view"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button
                            id="view-list"
                            variant={viewMode === "list" ? "default" : "ghost"}
                            size="icon"
                            className="rounded-l-none"
                            onClick={() => setViewMode("list")}
                            title="List view"
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Loading state */}
            {loading && (
                <div className="flex justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
                </div>
            )}

            {/* Results */}
            {!loading && hasSearched && processedResults.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-lg text-muted-foreground">No results found.</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        Try a different search term or adjust your filters.
                    </p>
                </div>
            )}

            {!loading && processedResults.length > 0 && (
                <>
                    <p className="text-sm text-muted-foreground">
                        {total} result{total !== 1 ? "s" : ""} found
                    </p>

                    {/* ====== GRID VIEW ====== */}
                    {viewMode === "grid" && (
                        <div className="grid gap-3 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
                            {processedResults.map((work) => (
                                <Link
                                    key={work.id}
                                    href={`/works/${work.id}?from=search&returnTo=${encodeURIComponent(searchReturnUrl)}`}
                                    className="group block rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-ring overflow-hidden"
                                >
                                    {/* Cover */}
                                    <div className="aspect-[3/4] relative bg-muted">
                                        {work.has_cover ? (
                                            <img
                                                src={`/api/works/${work.id}/cover?v=${work.updated_at}`}
                                                alt=""
                                                className="absolute inset-0 w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                                                <BookOpen className="h-8 w-8 opacity-30" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Details */}
                                    <div className="p-2 space-y-0.5">
                                        <h2 className="font-semibold text-xs leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                                            {work.title}
                                        </h2>
                                        {(() => {
                                            const authors = (work.authors ?? []).filter((a) => a.role === "author");
                                            if (authors.length === 0) return null;
                                            const display =
                                                authors.length > 2
                                                    ? `${authors[0].name}, ${authors[1].name} et al.`
                                                    : authors.map((a) => a.name).join(", ");
                                            return (
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {display}
                                                </p>
                                            );
                                        })()}
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {work.date_published && (
                                                <span className="text-xs text-muted-foreground">
                                                    {extractYear(work.date_published)}
                                                </span>
                                            )}
                                            {work.media_type && (
                                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                                    {work.media_type.charAt(0).toUpperCase() + work.media_type.slice(1)}
                                                </Badge>
                                            )}
                                            {work.checkout_count != null && (
                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                                                    <TrendingUp className="h-2.5 w-2.5" />
                                                    {work.checkout_count}
                                                </Badge>
                                            )}
                                        </div>
                                        {work.average_rating != null && (
                                            <div className="flex items-center gap-1">
                                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                                <span className="text-xs text-muted-foreground">
                                                    {work.average_rating.toFixed(1)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    {work.tags && work.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 px-2 pb-2">
                                            {work.tags.map((tag) => (
                                                <Badge
                                                    key={tag.id}
                                                    className="text-xs px-2 py-0 rounded-full"
                                                    style={tag.color ? { backgroundColor: tag.color, color: "#fff" } : undefined}
                                                >
                                                    {tag.name}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* ====== LIST VIEW ====== */}
                    {viewMode === "list" && (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>
                                        <button
                                            className="flex items-center font-medium hover:text-foreground transition-colors"
                                            onClick={() =>
                                                handleColumnSort("title")
                                            }
                                        >
                                            Title
                                            {renderSortIcon("title")}
                                        </button>
                                    </TableHead>
                                    <TableHead>
                                        <button
                                            className="flex items-center font-medium hover:text-foreground transition-colors"
                                            onClick={() =>
                                                handleColumnSort("call_number")
                                            }
                                        >
                                            Call Number
                                            {renderSortIcon("call_number")}
                                        </button>
                                    </TableHead>
                                    <TableHead>
                                        <button
                                            className="flex items-center font-medium hover:text-foreground transition-colors"
                                            onClick={() =>
                                                handleColumnSort(
                                                    "date_published"
                                                )
                                            }
                                        >
                                            Published
                                            {renderSortIcon("date_published")}
                                        </button>
                                    </TableHead>
                                    <TableHead>
                                        <button
                                            className="flex items-center font-medium hover:text-foreground transition-colors"
                                            onClick={() =>
                                                handleColumnSort("media_type")
                                            }
                                        >
                                            Type
                                            {renderSortIcon("media_type")}
                                        </button>
                                    </TableHead>
                                    <TableHead>Language</TableHead>
                                    <TableHead>
                                        <button
                                            className="flex items-center font-medium hover:text-foreground transition-colors"
                                            onClick={() =>
                                                handleColumnSort(
                                                    "number_of_pages"
                                                )
                                            }
                                        >
                                            Pages
                                            {renderSortIcon("number_of_pages")}
                                        </button>
                                    </TableHead>
                                    <TableHead>Publisher</TableHead>
                                    {sortField === "popularity" && (
                                        <TableHead>Checkouts</TableHead>
                                    )}
                                    <TableHead>
                                        <button
                                            className="flex items-center font-medium hover:text-foreground transition-colors"
                                            onClick={() =>
                                                handleColumnSort(
                                                    "average_rating"
                                                )
                                            }
                                        >
                                            Rating
                                            {renderSortIcon("average_rating")}
                                        </button>
                                    </TableHead>
                                    <TableHead>Tags</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {processedResults.map((work) => (
                                    <TableRow
                                        key={work.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => router.push(`/works/${work.id}?from=search&returnTo=${encodeURIComponent(searchReturnUrl)}`)}
                                    >
                                        <TableCell className="font-medium max-w-[280px] truncate">
                                            {work.title}
                                        </TableCell>
                                        <TableCell>
                                            {work.call_number ?? "—"}
                                        </TableCell>
                                        <TableCell>
                                            {work.date_published
                                                ? extractYear(work.date_published)
                                                : "—"}
                                        </TableCell>
                                        <TableCell>
                                            {work.media_type ? (
                                                <Badge variant="secondary">
                                                    {work.media_type
                                                        .charAt(0)
                                                        .toUpperCase() +
                                                        work.media_type.slice(
                                                            1
                                                        )}
                                                </Badge>
                                            ) : (
                                                "—"
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {work.language ?? "—"}
                                        </TableCell>
                                        <TableCell>
                                            {work.number_of_pages ?? "—"}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {work.publisher ?? "—"}
                                        </TableCell>
                                        {sortField === "popularity" && (
                                            <TableCell>
                                                <Badge variant="outline" className="gap-0.5">
                                                    <TrendingUp className="h-3 w-3" />
                                                    {work.checkout_count ?? 0}
                                                </Badge>
                                            </TableCell>
                                        )}
                                        <TableCell>
                                            {work.average_rating != null ? (
                                                <div className="flex items-center gap-1">
                                                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                                    <span className="text-sm">
                                                        {work.average_rating.toFixed(1)}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        ({work.rating_count})
                                                    </span>
                                                </div>
                                            ) : (
                                                "—"
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {work.tags && work.tags.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {work.tags.map((tag) => (
                                                        <Badge
                                                            key={tag.id}
                                                            className="text-xs px-2 py-0 rounded-full"
                                                            style={tag.color ? { backgroundColor: tag.color, color: "#fff" } : undefined}
                                                        >
                                                            {tag.name}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            ) : (
                                                "—"
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}

                    <PaginationControls
                        page={page}
                        pageSize={PAGE_SIZE}
                        total={total}
                        onPageChange={setPage}
                    />
                </>
            )}
        </div>
    );
}
