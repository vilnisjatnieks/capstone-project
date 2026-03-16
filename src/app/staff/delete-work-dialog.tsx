"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface Work {
    id: string;
    title: string;
}

interface DeleteWorkDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    work: Work | null;
    onDeleted: (id: string) => void;
}

export function DeleteWorkDialog({ open, onOpenChange, work, onDeleted }: DeleteWorkDialogProps) {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    async function handleDelete() {
        if (!work) return;
        setSubmitting(true);
        setError("");

        try {
            const res = await fetch(`/api/staff/works/${work.id}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Failed to delete work");
                return;
            }

            onDeleted(work.id);
            onOpenChange(false);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete Work</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete &quot;{work?.title}&quot;?
                        This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                {error && (
                    <p className="text-sm text-destructive">{error}</p>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={submitting}
                    >
                        {submitting ? "Deleting..." : "Delete"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
