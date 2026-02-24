"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";

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
    call_number: string | null;
}

type ViewMode = "grid" | "list";
type SortField =
    | "title"
    | "call_number"
    | "date_published"
    | "media_type"
    | "number_of_pages";
type SortDirection = "asc" | "desc";

const MEDIA_TYPES = ["book", "ebook", "audiobook", "periodical", "dvd", "other"];

const SORT_FIELD_LABELS: Record<SortField, string> = {
    title: "Title",
    call_number: "Call Number",
    date_published: "Date Published",
    media_type: "Media Type",
    number_of_pages: "Pages",
};

function extractYear(date: string): string {
    const match = date.match(/(\d{4})/);
    return match ? match[1] : date;
}

function compareValues(
    a: string | number | null | undefined,
    b: string | number | null | undefined,
    direction: SortDirection
): number {
    // Nulls always go to the end
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;

    let result: number;
    if (typeof a === "number" && typeof b === "number") {
        result = a - b;
    } else {
        result = String(a).localeCompare(String(b), undefined, {
            sensitivity: "base",
        });
    }
    return direction === "asc" ? result : -result;
}

export function SearchClient() {
    const [query, setQuery] = useState("");
    const [mediaFilter, setMediaFilter] = useState("all");
    const [results, setResults] = useState<Work[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // New state
    const [viewMode, setViewMode] = useState<ViewMode>("grid");
    const [sortField, setSortField] = useState<SortField>("title");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
    const [languageFilter, setLanguageFilter] = useState("all");

    const router = useRouter();

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

    // Distinct languages for filter dropdown
    const availableLanguages = useMemo(() => {
        const langs = new Set<string>();
        results.forEach((w) => {
            if (w.language) langs.add(w.language);
        });
        return Array.from(langs).sort();
    }, [results]);

    // Client-side filtering + sorting
    const processedResults = useMemo(() => {
        let filtered = results;

        if (languageFilter && languageFilter !== "all") {
            filtered = filtered.filter((w) => w.language === languageFilter);
        }

        const sorted = [...filtered].sort((a, b) =>
            compareValues(a[sortField], b[sortField], sortDirection)
        );

        return sorted;
    }, [results, languageFilter, sortField, sortDirection]);

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
                        placeholder="Search by title, publisher, editor, ISBN, or LCCN..."
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
                        {processedResults.length} result
                        {processedResults.length !== 1 ? "s" : ""} found
                        {languageFilter !== "all" &&
                            ` (filtered from ${results.length})`}
                    </p>

                    {/* ====== GRID VIEW ====== */}
                    {viewMode === "grid" && (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {processedResults.map((work) => (
                                <Link
                                    key={work.id}
                                    href={`/works/${work.id}`}
                                    className="block rounded-lg border bg-card p-5 shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <h2 className="font-semibold text-lg leading-tight">
                                            {work.title}
                                        </h2>
                                        {work.media_type && (
                                            <Badge
                                                variant="secondary"
                                                className="shrink-0"
                                            >
                                                {work.media_type
                                                    .charAt(0)
                                                    .toUpperCase() +
                                                    work.media_type.slice(1)}
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="space-y-1 text-sm text-muted-foreground">
                                        {work.call_number && (
                                            <p>
                                                <span className="font-medium text-foreground">
                                                    Call Number:
                                                </span>{" "}
                                                {work.call_number}
                                            </p>
                                        )}
                                        {work.editor && (
                                            <p>
                                                <span className="font-medium text-foreground">
                                                    Editor:
                                                </span>{" "}
                                                {work.editor}
                                            </p>
                                        )}
                                        {work.date_published && (
                                            <p>
                                                <span className="font-medium text-foreground">
                                                    Published:
                                                </span>{" "}
                                                {extractYear(work.date_published)}
                                            </p>
                                        )}
                                        {work.language && (
                                            <p>
                                                <span className="font-medium text-foreground">
                                                    Language:
                                                </span>{" "}
                                                {work.language}
                                            </p>
                                        )}
                                        {work.number_of_pages && (
                                            <p>
                                                <span className="font-medium text-foreground">
                                                    Pages:
                                                </span>{" "}
                                                {work.number_of_pages}
                                            </p>
                                        )}
                                        {work.location && (
                                            <p>
                                                <span className="font-medium text-foreground">
                                                    Location:
                                                </span>{" "}
                                                {work.location}
                                            </p>
                                        )}
                                    </div>

                                    {work.publisher && (
                                        <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                                            <p>Publisher: {work.publisher}</p>
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
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {processedResults.map((work) => (
                                    <TableRow
                                        key={work.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => router.push(`/works/${work.id}`)}
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
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </>
            )}
        </div>
    );
}
