import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingSearch() {
    return (
        <div className="mx-auto max-w-7xl px-4 py-8">
            <Skeleton className="h-10 w-72 mb-2" />
            <div className="mb-6" />

            {/* Search bar */}
            <div className="flex gap-2 mb-6">
                <Skeleton className="h-10 flex-1 max-w-xl" />
                <Skeleton className="h-10 w-24" />
            </div>

            {/* Filter row */}
            <div className="flex flex-wrap gap-3 mb-6">
                <Skeleton className="h-9 w-36" />
                <Skeleton className="h-9 w-36" />
                <Skeleton className="h-9 w-36" />
                <Skeleton className="h-9 w-28" />
            </div>

            {/* Result cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="border rounded-lg p-4 space-y-3">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-2/3" />
                        <div className="flex gap-2 pt-1">
                            <Skeleton className="h-5 w-16 rounded-full" />
                            <Skeleton className="h-5 w-20 rounded-full" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
