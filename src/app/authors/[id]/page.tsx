import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User } from "lucide-react";

import { getAuthorWithWorks } from "@/lib/data/authors";
import { Button } from "@/components/ui/button";

export const revalidate = 0;

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function AuthorPage({ params }: PageProps) {
    const { id } = await params;
    const author = await getAuthorWithWorks(id);

    if (!author) {
        notFound();
    }

    const authored = author.works.filter((w) => w.role === "author");
    const edited = author.works.filter((w) => w.role === "editor");
    const translated = author.works.filter((w) => w.role === "translator");

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="mb-6 -ml-4">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground" asChild>
                    <Link href="/">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Home
                    </Link>
                </Button>
            </div>

            <div className="flex items-center gap-4 mb-8">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                        {author.name}
                    </h1>
                    {author.sort_name && (
                        <p className="text-sm text-muted-foreground mt-1">
                            Sort: {author.sort_name}
                        </p>
                    )}
                </div>
            </div>

            {author.works.length === 0 ? (
                <p className="text-muted-foreground">No works attributed yet.</p>
            ) : (
                <div className="space-y-8">
                    {authored.length > 0 && (
                        <WorksSection title="Authored" works={authored} />
                    )}
                    {edited.length > 0 && (
                        <WorksSection title="Edited" works={edited} />
                    )}
                    {translated.length > 0 && (
                        <WorksSection title="Translated" works={translated} />
                    )}
                </div>
            )}
        </div>
    );
}

interface WorkRow {
    id: string;
    title: string;
    date_published: string | null;
    publisher: string | null;
}

function WorksSection({ title, works }: { title: string; works: WorkRow[] }) {
    return (
        <section>
            <h2 className="text-xl font-semibold mb-3">{title}</h2>
            <ul className="divide-y border rounded-md">
                {works.map((w) => (
                    <li key={w.id}>
                        <Link
                            href={`/works/${w.id}`}
                            className="block px-4 py-3 hover:bg-muted/50 transition-colors"
                        >
                            <div className="font-medium">{w.title}</div>
                            <div className="text-sm text-muted-foreground">
                                {[w.publisher, w.date_published].filter(Boolean).join(" • ") || "—"}
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}
