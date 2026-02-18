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

interface Checkout {
    id: string;
    work_title: string;
    user_name: string;
}

interface ReturnCheckoutDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    checkout: Checkout | null;
    onReturned: () => void;
}

export function ReturnCheckoutDialog({ open, onOpenChange, checkout, onReturned }: ReturnCheckoutDialogProps) {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    async function handleReturn() {
        if (!checkout) return;
        setSubmitting(true);
        setError("");

        try {
            const res = await fetch(`/api/staff/checkouts/${checkout.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "return" }),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Failed to return item");
                return;
            }

            onOpenChange(false);
            onReturned();
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Return Item</DialogTitle>
                    <DialogDescription>
                        Return &quot;{checkout?.work_title}&quot; from{" "}
                        {checkout?.user_name}?
                    </DialogDescription>
                </DialogHeader>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleReturn} disabled={submitting}>
                        {submitting ? "Returning..." : "Confirm Return"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
