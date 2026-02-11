import { SearchClient } from "./search-client";

export default function SearchPage() {
    return (
        <div className="mx-auto max-w-7xl px-4 py-8">
            <h1 className="text-4xl font-bold mb-2">Search the Catalog</h1>
            <p className="text-muted-foreground mb-8">
                Browse and search the Karson Institute Digital Library collection.
            </p>
            <SearchClient />
        </div>
    );
}
