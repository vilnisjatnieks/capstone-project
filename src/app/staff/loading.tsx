import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/table-skeleton";

export default function LoadingStaff() {
    return (
        <div className="mx-auto max-w-7xl px-4 py-8 space-y-10">
            <section>
                <Skeleton className="h-8 w-48 mb-6" />
                <div className="flex items-center gap-4 mb-4">
                    <Skeleton className="h-9 w-36" />
                    <Skeleton className="h-9 w-64" />
                </div>
                <TableSkeleton
                    columns={7}
                    headers={["Title", "Publisher", "Call Number", "Date Published", "Pages", "Location", "Actions"]}
                />
            </section>

            <section>
                <Skeleton className="h-8 w-32 mb-6" />
                <div className="flex items-center gap-4 mb-4">
                    <Skeleton className="h-9 w-36" />
                    <Skeleton className="h-9 w-64" />
                    <Skeleton className="h-9 w-40" />
                </div>
                <TableSkeleton
                    columns={6}
                    headers={["Work", "Borrower", "Checked Out", "Due Date", "Status", "Actions"]}
                />
            </section>

            <section>
                <Skeleton className="h-8 w-16 mb-6" />
                <div className="flex items-center gap-4 mb-4">
                    <Skeleton className="h-9 w-28" />
                    <Skeleton className="h-9 w-56" />
                </div>
                <TableSkeleton
                    columns={3}
                    headers={["Name", "Color", "Actions"]}
                    rows={4}
                />
            </section>
        </div>
    );
}
