"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    color: string | null;
    created_at: string;
    updated_at: string;
}

interface TagFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingTag: Tag | null;
    onSaved: (tag: Tag, isNew: boolean) => void;
}

const emptyForm = {
    name: "",
    color: "",
};

export function TagFormDialog({ open, onOpenChange, editingTag, onSaved }: TagFormDialogProps) {
    const [formData, setFormData] = useState(emptyForm);
    const [formError, setFormError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) return;
        setFormError("");
        if (editingTag) {
            setFormData({
                name: editingTag.name,
                color: editingTag.color ?? "",
            });
        } else {
            setFormData(emptyForm);
        }
    }, [open, editingTag]);

    async function handleSubmit(e: React.SyntheticEvent) {
        e.preventDefault();
        setSubmitting(true);
        setFormError("");

        try {
            if (editingTag) {
                const updates: Record<string, string | null> = {};
                if (formData.name !== editingTag.name) updates.name = formData.name;
                if (formData.color !== (editingTag.color ?? "")) {
                    updates.color = formData.color || null;
                }

                if (Object.keys(updates).length === 0) {
                    onOpenChange(false);
                    return;
                }

                const res = await fetch(`/api/staff/tags/${editingTag.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updates),
                });

                if (!res.ok) {
                    const data = await res.json();
                    setFormError(data.error || "Failed to update tag");
                    return;
                }

                const updated = await res.json();
                onSaved(updated, false);
            } else {
                const payload: Record<string, string | null> = { name: formData.name };
                if (formData.color) payload.color = formData.color;

                const res = await fetch("/api/staff/tags", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                if (!res.ok) {
                    const data = await res.json();
                    setFormError(data.error || "Failed to create tag");
                    return;
                }

                const created = await res.json();
                onSaved(created, true);
            }

            onOpenChange(false);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>
                        {editingTag ? "Edit Tag" : "Add Tag"}
                    </DialogTitle>
                    <DialogDescription>
                        {editingTag
                            ? "Update the tag details below."
                            : "Create a new tag for organizing works."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="tag-name">Name</Label>
                        <Input
                            id="tag-name"
                            required
                            value={formData.name}
                            onChange={(e) =>
                                setFormData((prev) => ({ ...prev, name: e.target.value }))
                            }
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="tag-color">Color</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id="tag-color"
                                type="color"
                                value={formData.color || "#6b7280"}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, color: e.target.value }))
                                }
                                className="w-16 h-10 p-1 cursor-pointer"
                            />
                            <span className="text-sm text-muted-foreground">
                                {formData.color || "No color"}
                            </span>
                            {formData.color && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                        setFormData((prev) => ({ ...prev, color: "" }))
                                    }
                                >
                                    Clear
                                </Button>
                            )}
                        </div>
                    </div>
                    {formError && (
                        <p className="text-sm text-destructive">{formError}</p>
                    )}
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting
                                ? "Saving..."
                                : editingTag
                                    ? "Save Changes"
                                    : "Create Tag"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
