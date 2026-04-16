"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
}

function getPageWindow(current: number, totalPages: number): (number | "...")[] {
    const items: (number | "...")[] = [];
    const add = (n: number | "...") => items.push(n);

    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) add(i);
        return items;
    }

    add(1);
    if (current > 3) add("...");
    const start = Math.max(2, current - 1);
    const end = Math.min(totalPages - 1, current + 1);
    for (let i = start; i <= end; i++) add(i);
    if (current < totalPages - 2) add("...");
    add(totalPages);
    return items;
}

export function PaginationControls({
    page,
    pageSize,
    total,
    onPageChange,
}: PaginationControlsProps) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (total === 0 || totalPages <= 1) return null;

    const window = getPageWindow(page, totalPages);

    return (
        <nav
            aria-label="Pagination"
            className="flex items-center justify-center gap-1 py-4"
        >
            <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                aria-label="Previous page"
            >
                <ChevronLeft /> Previous
            </Button>
            {window.map((item, i) =>
                item === "..." ? (
                    <span
                        key={`ellipsis-${i}`}
                        className="px-2 text-sm text-muted-foreground"
                        aria-hidden="true"
                    >
                        …
                    </span>
                ) : (
                    <Button
                        key={item}
                        variant={item === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => onPageChange(item)}
                        aria-current={item === page ? "page" : undefined}
                    >
                        {item}
                    </Button>
                )
            )}
            <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                aria-label="Next page"
            >
                Next <ChevronRight />
            </Button>
        </nav>
    );
}
