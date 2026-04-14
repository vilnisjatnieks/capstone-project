"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Hand } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";

export interface HoldWorkButtonProps {
    workId: string;
    holdStatus: "none" | "own" | "other";
    holdUserName?: string;
}

export function HoldWorkButton({ workId, holdStatus, holdUserName }: HoldWorkButtonProps) {
    const [loading, setLoading] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const router = useRouter();

    const handleRequestHold = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/works/${workId}/hold`, {
                method: "POST",
            });
            if (res.ok) {
                toast.success("Hold requested");
                router.refresh();
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.error || "Failed to request hold");
            }
        } catch {
            toast.error("Failed to request hold");
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveHold = async () => {
        const res = await fetch(`/api/works/${workId}/hold`, {
            method: "DELETE",
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Failed to remove hold");
        }
        toast.success("Hold removed");
        router.refresh();
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
            <>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmOpen(true)}
                    disabled={loading}
                    className="gap-2"
                >
                    <Hand className="h-4 w-4" />
                    Remove Hold
                </Button>
                <ConfirmDialog
                    open={confirmOpen}
                    onOpenChange={setConfirmOpen}
                    title="Remove hold?"
                    description="You can request this book again later."
                    confirmLabel="Remove hold"
                    destructive
                    onConfirm={handleRemoveHold}
                />
            </>
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
