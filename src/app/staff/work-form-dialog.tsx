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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Work {
    id: string;
    title: string;
    date_published: string | null;
    publisher: string | null;
    editor: string | null;
    lccn: string | null;
    isbn_10: string | null;
    isbn_13: string | null;
    media_type: string | null;
    number_of_pages: number | null;
    language: string | null;
    location: string | null;
    created_at: string;
    updated_at: string;
}

interface WorkFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingWork: Work | null;
    onSaved: (work: Work, isNew: boolean) => void;
}

const MEDIA_TYPES = ["book", "ebook", "audiobook", "periodical", "dvd", "other"];

const emptyForm = {
    title: "",
    date_published: "",
    publisher: "",
    editor: "",
    lccn: "",
    isbn_10: "",
    isbn_13: "",
    media_type: "",
    number_of_pages: "",
    language: "",
    location: "",
};

export function WorkFormDialog({ open, onOpenChange, editingWork, onSaved }: WorkFormDialogProps) {
    const [formData, setFormData] = useState(emptyForm);
    const [formError, setFormError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) return;
        setFormError("");
        if (editingWork) {
            setFormData({
                title: editingWork.title,
                date_published: editingWork.date_published ?? "",
                publisher: editingWork.publisher ?? "",
                editor: editingWork.editor ?? "",
                lccn: editingWork.lccn ?? "",
                isbn_10: editingWork.isbn_10 ?? "",
                isbn_13: editingWork.isbn_13 ?? "",
                media_type: editingWork.media_type ?? "",
                number_of_pages: editingWork.number_of_pages?.toString() ?? "",
                language: editingWork.language ?? "",
                location: editingWork.location ?? "",
            });
        } else {
            setFormData(emptyForm);
        }
    }, [open, editingWork]);

    async function handleSubmit(e: React.SyntheticEvent) {
        e.preventDefault();
        setSubmitting(true);
        setFormError("");

        try {
            if (editingWork) {
                const updates: Record<string, string> = {};
                if (formData.title !== editingWork.title) updates.title = formData.title;
                if (formData.date_published !== (editingWork.date_published ?? ""))
                    updates.date_published = formData.date_published;
                if (formData.publisher !== (editingWork.publisher ?? ""))
                    updates.publisher = formData.publisher;
                if (formData.editor !== (editingWork.editor ?? ""))
                    updates.editor = formData.editor;
                if (formData.lccn !== (editingWork.lccn ?? ""))
                    updates.lccn = formData.lccn;
                if (formData.isbn_10 !== (editingWork.isbn_10 ?? ""))
                    updates.isbn_10 = formData.isbn_10;
                if (formData.isbn_13 !== (editingWork.isbn_13 ?? ""))
                    updates.isbn_13 = formData.isbn_13;
                if (formData.media_type !== (editingWork.media_type ?? ""))
                    updates.media_type = formData.media_type;
                if (formData.number_of_pages !== (editingWork.number_of_pages?.toString() ?? ""))
                    updates.number_of_pages = formData.number_of_pages;
                if (formData.language !== (editingWork.language ?? ""))
                    updates.language = formData.language;
                if (formData.location !== (editingWork.location ?? ""))
                    updates.location = formData.location;

                if (Object.keys(updates).length === 0) {
                    onOpenChange(false);
                    return;
                }

                const res = await fetch(`/api/staff/works/${editingWork.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updates),
                });

                if (!res.ok) {
                    const data = await res.json();
                    setFormError(data.error || "Failed to update work");
                    return;
                }

                const updated = await res.json();
                onSaved(updated, false);
            } else {
                const res = await fetch("/api/staff/works", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData),
                });

                if (!res.ok) {
                    const data = await res.json();
                    setFormError(data.error || "Failed to create work");
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
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {editingWork ? "Edit Work" : "Add Work"}
                    </DialogTitle>
                    <DialogDescription>
                        {editingWork
                            ? "Update the work's details below."
                            : "Fill in the details to create a new work."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            required
                            value={formData.title}
                            onChange={(e) =>
                                setFormData((prev) => ({ ...prev, title: e.target.value }))
                            }
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="publisher">Publisher</Label>
                            <Input
                                id="publisher"
                                value={formData.publisher}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        publisher: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="editor">Editor</Label>
                            <Input
                                id="editor"
                                value={formData.editor}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        editor: e.target.value,
                                    }))
                                }
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="date_published">Date Published</Label>
                            <Input
                                id="date_published"
                                placeholder="e.g. 2024-01-15"
                                value={formData.date_published}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        date_published: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="media-type">Media Type</Label>
                            <Select
                                name="media-type"
                                value={formData.media_type}
                                onValueChange={(value) =>
                                    setFormData((prev) => ({ ...prev, media_type: value }))
                                }
                            >
                                <SelectTrigger id="media-type">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {MEDIA_TYPES.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="isbn_10">ISBN-10</Label>
                            <Input
                                id="isbn_10"
                                value={formData.isbn_10}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        isbn_10: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="isbn_13">ISBN-13</Label>
                            <Input
                                id="isbn_13"
                                value={formData.isbn_13}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        isbn_13: e.target.value,
                                    }))
                                }
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="lccn">LCCN</Label>
                            <Input
                                id="lccn"
                                value={formData.lccn}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        lccn: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="location">Location</Label>
                            <Input
                                id="location"
                                value={formData.location}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        location: e.target.value,
                                    }))
                                }
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="number_of_pages">Number of Pages</Label>
                            <Input
                                id="number_of_pages"
                                type="number"
                                value={formData.number_of_pages}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        number_of_pages: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="language">Language</Label>
                            <Input
                                id="language"
                                placeholder="e.g. English"
                                value={formData.language}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        language: e.target.value,
                                    }))
                                }
                            />
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
                                : editingWork
                                    ? "Save Changes"
                                    : "Create Work"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
