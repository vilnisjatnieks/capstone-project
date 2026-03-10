import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BookOpen, Clock, Globe, Hash, Library, MapPin, Building, User } from "lucide-react";

import { getPublicWorkById } from "@/lib/data/works";
import { getAllUsers } from "@/lib/data/users";
import { isWorkCheckedOut, getActiveCheckoutForWork, getCheckoutById } from "@/lib/data/checkouts";
import { getCurrentUser } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditWorkButton } from "./edit-work-button";
import { CheckoutWorkButton } from "./checkout-work-button";
import { ReturnWorkButton } from "./return-work-button";

export const revalidate = 0; // Dynamic page

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function WorkPage({ params }: PageProps) {
    const { id } = await params;

    const work = await getPublicWorkById(id);

    if (!work) {
        notFound();
    }

    const user = await getCurrentUser();
    const isStaffOrAdmin = user?.role === "staff" || user?.role === "admin";

    let allUsers: any[] = [];
    let isCheckedOut = false;
    let activeCheckout = null;

    if (isStaffOrAdmin) {
        allUsers = await getAllUsers();
        isCheckedOut = await isWorkCheckedOut(work.id);
        if (isCheckedOut) {
            const activeCheckoutId = await getActiveCheckoutForWork(work.id);
            if (activeCheckoutId) {
                activeCheckout = await getCheckoutById(activeCheckoutId);
            }
        }
    }

    const yearPublished = work.date_published
        ? work.date_published.match(/(\d{4})/)
            ? work.date_published.match(/(\d{4})/)![1]
            : work.date_published
        : null;

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            {/* Top Navigation Bar: Back button and Edit button */}
            <div className="flex justify-between items-center mb-6 -ml-4">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground" asChild>
                    <Link href="/search">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Search
                    </Link>
                </Button>

                {isStaffOrAdmin && (
                    <div className="mr-4 flex gap-2">
                        {isCheckedOut && activeCheckout && (
                            <ReturnWorkButton checkout={activeCheckout} />
                        )}
                        <CheckoutWorkButton work={work} users={allUsers} disabled={isCheckedOut} />
                        <EditWorkButton work={work} />
                    </div>
                )}
            </div>

            <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
                {/* Left Column: Cover Image */}
                <div className="w-full md:w-1/3 lg:w-1/4 shrink-0">
                    <div className="aspect-[2/3] relative rounded-lg overflow-hidden shadow-lg border bg-muted flex items-center justify-center">
                        {work.cover ? (
                            <Image
                                src={`data:image/jpeg;base64,${work.cover}`}
                                alt={`Cover of ${work.title}`}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
                                priority
                            />
                        ) : (
                            <div className="flex flex-col border w-full h-full items-center justify-center text-muted-foreground p-6 text-center bg-card">
                                <BookOpen className="h-16 w-16 mb-4 opacity-50" />
                                <span className="text-sm font-medium">No cover available</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Book Details */}
                <div className="flex-1 space-y-6">
                    <div>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {work.media_type && (
                                <Badge variant="secondary" className="px-3 py-1 text-sm rounded-full">
                                    {work.media_type.charAt(0).toUpperCase() + work.media_type.slice(1)}
                                </Badge>
                            )}
                            {work.language && (
                                <Badge variant="outline" className="px-3 py-1 text-sm rounded-full">
                                    {work.language}
                                </Badge>
                            )}
                        </div>
                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight mb-2">
                            {work.title}
                        </h1>

                        {(work.editor || work.publisher) && (
                            <div className="text-xl text-muted-foreground flex items-center gap-2 flex-wrap">
                                {work.editor && <span className="font-medium">By {work.editor}</span>}
                                {work.editor && work.publisher && <span>•</span>}
                                {work.publisher && <span>{work.publisher}</span>}
                            </div>
                        )}
                    </div>

                    <hr className="my-6 border-muted" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                        {work.date_published && (
                            <div className="flex items-start gap-3">
                                <Clock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Published</p>
                                    <p className="text-base text-foreground">{work.date_published}</p>
                                </div>
                            </div>
                        )}

                        {work.number_of_pages && (
                            <div className="flex items-start gap-3">
                                <BookOpen className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Format</p>
                                    <p className="text-base text-foreground">{work.number_of_pages} Pages</p>
                                </div>
                            </div>
                        )}

                        {work.location && (
                            <div className="flex items-start gap-3">
                                <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Location</p>
                                    <p className="text-base text-foreground">{work.location}</p>
                                </div>
                            </div>
                        )}

                        {work.call_number && (
                            <div className="flex items-start gap-3">
                                <Library className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Call Number</p>
                                    <p className="text-base font-semibold py-1 px-2 bg-muted rounded-md inline-block font-mono tracking-wider">
                                        {work.call_number}
                                    </p>
                                </div>
                            </div>
                        )}

                        {work.language && (
                            <div className="flex items-start gap-3">
                                <Globe className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Language</p>
                                    <p className="text-base text-foreground">{work.language}</p>
                                </div>
                            </div>
                        )}

                        {(work.isbn_13 || work.isbn_10 || work.lccn) && (
                            <div className="flex items-start gap-3 opacity-75">
                                <Hash className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                <div className="space-y-3">
                                    {work.isbn_13 && (
                                        <div>
                                            <p className="text-xs text-muted-foreground">ISBN-13</p>
                                            <p className="text-sm font-mono text-muted-foreground">{work.isbn_13}</p>
                                        </div>
                                    )}
                                    {work.isbn_10 && (
                                        <div>
                                            <p className="text-xs text-muted-foreground">ISBN-10</p>
                                            <p className="text-sm font-mono text-muted-foreground">{work.isbn_10}</p>
                                        </div>
                                    )}
                                    {work.lccn && (
                                        <div>
                                            <p className="text-xs text-muted-foreground">LCCN</p>
                                            <p className="text-sm font-mono text-muted-foreground">{work.lccn}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Add action buttons here in the future when borrowing is public */}
                </div>
            </div>
        </div>
    );
}
