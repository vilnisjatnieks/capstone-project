import { Loader2 } from "lucide-react";

export default function LoadingWork() {
    return (
        <div className="container mx-auto px-4 py-24 flex flex-col items-center justify-center min-h-[60vh]">
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">Loading book details...</p>
        </div>
    );
}
