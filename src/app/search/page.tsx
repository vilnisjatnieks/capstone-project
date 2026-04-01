import { SearchClient } from "./search-client";

interface SearchPageProps {
    searchParams: Promise<{ q?: string | string[] }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
    const { q } = await searchParams;
    const initialQuery = typeof q === "string" ? q : "";

    return (
        <div className="mx-auto max-w-7xl px-4 py-8">
            <h1 className="text-4xl font-bold mb-2">Search the Full Catalog</h1>
            <br></br>
            <SearchClient key={initialQuery} initialQuery={initialQuery} />
        </div>
    );
}
