import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookX } from "lucide-react";

export default function WorkNotFound() {
    return (
        <div className="container mx-auto px-4 py-24 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
            <BookX className="h-16 w-16 text-muted-foreground" />
            <h1 className="text-3xl font-bold tracking-tight">Book Not Found</h1>
            <p className="text-muted-foreground max-w-md">
                We couldn&apos;t find the book you&apos;re looking for. It may have been removed or the ID is incorrect.
            </p>
            <div className="pt-4">
                <Button asChild>
                    <Link href="/search">Return to Search</Link>
                </Button>
            </div>
        </div>
    );
}
