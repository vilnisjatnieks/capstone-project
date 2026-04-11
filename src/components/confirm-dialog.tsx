"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    onConfirm: () => Promise<void> | void;
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    destructive = false,
    onConfirm,
}: ConfirmDialogProps) {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (open) setError("");
    }, [open]);

    async function handleConfirm() {
        setSubmitting(true);
        setError("");
        try {
            await onConfirm();
            onOpenChange(false);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                {error && (
                    <p className="text-sm text-destructive">{error}</p>
                )}
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={submitting}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={destructive ? "destructive" : "default"}
                        onClick={handleConfirm}
                        disabled={submitting}
                    >
                        {submitting ? `${confirmLabel}...` : confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
