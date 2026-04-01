"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export function HomeSearchBar() {
    const [query, setQuery] = useState("");
    const router = useRouter();

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const q = query.trim();
        router.push("/search" + (q ? "?q=" + encodeURIComponent(q) : ""));
    }

    return (
        <form onSubmit={handleSubmit}>
            <h2 className="text-xl font-semibold mb-4">Search the Full Catalog</h2>
            <div className="relative flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="Search by title, publisher, editor, ISBN, or LCCN..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="pl-12 h-14 text-lg"
                    />
                </div>
                <Button type="submit" className="h-14 px-6 text-lg">Search</Button>
            </div>
        </form>
    );
}
