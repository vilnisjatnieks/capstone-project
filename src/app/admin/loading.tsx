import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/table-skeleton";

export default function LoadingAdmin() {
    return (
        <div className="mx-auto max-w-7xl px-4 py-8">
            <Skeleton className="h-8 w-48 mb-6" />
            <div className="flex items-center gap-4 mb-4">
                <Skeleton className="h-9 w-56" />
                <Skeleton className="h-9 w-40" />
            </div>
            <TableSkeleton
                columns={5}
                headers={["Name", "Email", "Role", "Created", "Actions"]}
            />
        </div>
    );
}
