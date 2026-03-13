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

interface Tag {
    id: string;
    name: string;
}

interface DeleteTagDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tag: Tag | null;
    onDeleted: (id: string) => void;
}

export function DeleteTagDialog({ open, onOpenChange, tag, onDeleted }: DeleteTagDialogProps) {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    async function handleDelete() {
        if (!tag) return;
        setSubmitting(true);
        setError("");

        try {
            const res = await fetch(`/api/staff/tags/${tag.id}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Failed to delete tag");
                return;
            }

            onDeleted(tag.id);
            onOpenChange(false);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete Tag</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete &quot;{tag?.name}&quot;?
                        This will remove the tag from all works. This action cannot be undone.
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
