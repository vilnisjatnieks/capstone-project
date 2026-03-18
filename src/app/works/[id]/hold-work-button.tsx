"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Hand } from "lucide-react";

import { Button } from "@/components/ui/button";

export interface HoldWorkButtonProps {
    workId: string;
    holdStatus: "none" | "own" | "other";
    holdUserName?: string;
}

export function HoldWorkButton({ workId, holdStatus, holdUserName }: HoldWorkButtonProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleRequestHold = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/works/${workId}/hold`, {
                method: "POST",
            });
            if (res.ok) {
                router.refresh();
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveHold = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/works/${workId}/hold`, {
                method: "DELETE",
            });
            if (res.ok) {
                router.refresh();
            }
        } finally {
            setLoading(false);
        }
    };

    if (holdStatus === "other") {
        return (
            <Button size="sm" variant="outline" disabled className="gap-2">
                <Hand className="h-4 w-4" />
                On Hold by {holdUserName}
            </Button>
        );
    }

    if (holdStatus === "own") {
        return (
            <Button
                size="sm"
                variant="outline"
                onClick={handleRemoveHold}
                disabled={loading}
                className="gap-2"
            >
                <Hand className="h-4 w-4" />
                {loading ? "Removing..." : "Remove Hold"}
            </Button>
        );
    }

    return (
        <Button
            size="sm"
            onClick={handleRequestHold}
            disabled={loading}
            className="gap-2"
        >
            <Hand className="h-4 w-4" />
            {loading ? "Requesting..." : "Request Hold"}
        </Button>
    );
}
