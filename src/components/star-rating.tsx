"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
    value: number | null;
    averageRating: number | null;
    ratingCount: number;
    interactive: boolean;
    canRate: boolean;
    workId: string;
}

export function StarRating({
    value,
    averageRating,
    ratingCount,
    interactive,
    canRate,
    workId,
}: StarRatingProps) {
    const [currentRating, setCurrentRating] = useState<number | null>(value);
    const [hoveredStar, setHoveredStar] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const displayRating = hoveredStar ?? currentRating ?? 0;

    async function handleClick(star: number) {
        if (!interactive || !canRate || submitting) return;

        const previousRating = currentRating;
        setCurrentRating(star);
        setSubmitting(true);

        try {
            const res = await fetch(`/api/works/${workId}/rating`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rating: star }),
            });
            if (!res.ok) {
                setCurrentRating(previousRating);
            }
        } catch {
            setCurrentRating(previousRating);
        } finally {
            setSubmitting(false);
        }
    }

    const isClickable = interactive && canRate;

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            disabled={!isClickable || submitting}
                            className={`p-0 border-0 bg-transparent ${
                                isClickable
                                    ? "cursor-pointer hover:scale-110 transition-transform"
                                    : "cursor-default"
                            }`}
                            onClick={() => handleClick(star)}
                            onMouseEnter={() =>
                                isClickable && setHoveredStar(star)
                            }
                            onMouseLeave={() =>
                                isClickable && setHoveredStar(null)
                            }
                            aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
                        >
                            <Star
                                className={`h-5 w-5 ${
                                    star <= displayRating
                                        ? "fill-yellow-400 text-yellow-400"
                                        : "text-muted-foreground"
                                }`}
                            />
                        </button>
                    ))}
                </div>
                <span className="text-sm text-muted-foreground">
                    {averageRating != null
                        ? `${averageRating.toFixed(1)} (${ratingCount} rating${ratingCount !== 1 ? "s" : ""})`
                        : "No ratings yet"}
                </span>
            </div>
            {interactive && !canRate && (
                <p className="text-xs text-muted-foreground">
                    Check out and return this book to rate it
                </p>
            )}
            {interactive && canRate && currentRating && (
                <p className="text-xs text-muted-foreground">
                    Your rating: {currentRating}
                </p>
            )}
        </div>
    );
}
