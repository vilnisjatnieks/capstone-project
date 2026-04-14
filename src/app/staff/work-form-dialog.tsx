"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { ScanBarcode, Search, Loader2, CheckCircle2, AlertCircle, ImagePlus, X } from "lucide-react";
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
    call_number: string | null;
    created_at: string;
    updated_at: string;
}

interface WorkFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingWork: Work | null;
    onSaved: (work: Work, isNew: boolean) => void;
    autoFocusISBN?: boolean;
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
    call_number: "",
};

export function WorkFormDialog({ open, onOpenChange, editingWork, onSaved, autoFocusISBN }: WorkFormDialogProps) {
    const [formData, setFormData] = useState(emptyForm);
    const [formError, setFormError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // ISBN lookup state
    const [isbnInput, setIsbnInput] = useState("");
    const [lookupLoading, setLookupLoading] = useState(false);
    const [lookupMessage, setLookupMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const isbnInputRef = useRef<HTMLInputElement>(null);

    // Cover image (base64-encoded) — from ISBN lookup or manual upload
    const [coverBase64, setCoverBase64] = useState<string | null>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    function handleCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            // Strip the data:image/...;base64, prefix
            const result = reader.result as string;
            const base64 = result.split(",")[1];
            if (base64) setCoverBase64(base64);
        };
        reader.readAsDataURL(file);
        // Reset so the same file can be re-selected
        e.target.value = "";
    }

    useEffect(() => {
        if (!open) return;
        setFormError("");
        setIsbnInput("");
        setLookupMessage(null);
        setLookupLoading(false);
        setCoverBase64(null);
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
                call_number: editingWork.call_number ?? "",
            });
        } else {
            setFormData(emptyForm);
        }
    }, [open, editingWork]);

    // Auto-focus ISBN field when opened with autoFocusISBN
    useEffect(() => {
        if (open && autoFocusISBN && !editingWork) {
            // Small delay to ensure dialog has rendered
            const timer = setTimeout(() => {
                isbnInputRef.current?.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [open, autoFocusISBN, editingWork]);

    async function handleISBNLookup() {
        const isbn = isbnInput.trim();
        if (!isbn) {
            setLookupMessage({ type: "error", text: "Please enter an ISBN." });
            return;
        }

        setLookupLoading(true);
        setLookupMessage(null);

        try {
            const res = await fetch(`/api/staff/works/lookup?isbn=${encodeURIComponent(isbn)}`);
            const data = await res.json();

            if (!res.ok) {
                setLookupMessage({ type: "error", text: data.error || "Lookup failed." });
                return;
            }

            // Auto-fill form: clear all fields first, then populate with lookup data
            setFormData(() => ({
                ...emptyForm,
                title: data.title || "",
                publisher: data.publisher || "",
                date_published: data.date_published || "",
                isbn_10: data.isbn_10 || "",
                isbn_13: data.isbn_13 || "",
                lccn: data.lccn || "",
                number_of_pages: data.number_of_pages?.toString() || "",
                language: data.language || "",
                media_type: data.media_type || "",
                call_number: data.call_number || "",
            }));

            // Store cover image if returned
            setCoverBase64(data.cover || null);

            setLookupMessage({
                type: "success",
                text: `Found: ${data.title}`,
            });
        } catch {
            setLookupMessage({ type: "error", text: "Network error. Please try again." });
        } finally {
            setLookupLoading(false);
        }
    }

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
                if (formData.call_number !== (editingWork.call_number ?? ""))
                    updates.call_number = formData.call_number;

                // Include cover if one was uploaded
                if (coverBase64) {
                    updates.cover = coverBase64;
                }

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
                toast.success(`"${updated.title}" updated`);
                onSaved(updated, false);
            } else {
                const payload = coverBase64
                    ? { ...formData, cover: coverBase64 }
                    : formData;
                const res = await fetch("/api/staff/works", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                if (!res.ok) {
                    const data = await res.json();
                    setFormError(data.error || "Failed to create work");
                    return;
                }

                const created = await res.json();
                toast.success(`"${created.title}" created`);
                onSaved(created, true);
            }

            onOpenChange(false);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <div className="p-6 pb-0">
                    <DialogHeader>
                        <DialogTitle>
                            {editingWork ? "Edit Work" : "Add Work"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingWork
                                ? "Update the work's details below."
                                : "Enter an ISBN to auto-fill, or fill in the details manually."}
                        </DialogDescription>
                    </DialogHeader>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {/* ── ISBN Auto-fill Section ── */}
                        {!editingWork && (
                            <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 space-y-3">
                                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                                    <ScanBarcode className="h-4 w-4" />
                                    Quick Fill by ISBN
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        ref={isbnInputRef}
                                        id="isbn-lookup"
                                        placeholder="Enter ISBN-10 or ISBN-13..."
                                        value={isbnInput}
                                        onChange={(e) => {
                                            setIsbnInput(e.target.value);
                                            setLookupMessage(null);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleISBNLookup();
                                            }
                                        }}
                                        className="flex-1"
                                    />
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={handleISBNLookup}
                                        disabled={lookupLoading}
                                        className="shrink-0"
                                    >
                                        {lookupLoading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Search className="h-4 w-4" />
                                        )}
                                        <span className="ml-1">
                                            {lookupLoading ? "Looking up..." : "Look Up"}
                                        </span>
                                    </Button>
                                </div>
                                {lookupMessage && (
                                    <div
                                        className={`flex items-center gap-2 text-sm ${lookupMessage.type === "success"
                                            ? "text-green-600 dark:text-green-400"
                                            : "text-destructive"
                                            }`}
                                    >
                                        {lookupMessage.type === "success" ? (
                                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                                        ) : (
                                            <AlertCircle className="h-4 w-4 shrink-0" />
                                        )}
                                        {lookupMessage.text}
                                    </div>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    Tip: Scan a barcode or type an ISBN to auto-fill all fields below
                                </p>
                            </div>
                        )}

                        {/* ── Cover + Title ── */}
                        <div className="flex gap-4">
                            <input
                                ref={coverInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleCoverFile}
                            />
                            <div className="relative shrink-0">
                                {coverBase64 ? (
                                    <>
                                        <img
                                            src={`data:image/jpeg;base64,${coverBase64}`}
                                            alt="Cover preview"
                                            className="h-24 w-auto rounded border object-cover cursor-pointer"
                                            onClick={() => coverInputRef.current?.click()}
                                            title="Click to replace"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setCoverBase64(null)}
                                            className="absolute -top-1.5 -right-1.5 rounded-full bg-destructive text-destructive-foreground h-5 w-5 flex items-center justify-center shadow-sm"
                                            title="Remove cover"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => coverInputRef.current?.click()}
                                        className="h-24 w-16 rounded border border-dashed border-muted-foreground/40 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                                        title="Upload cover image"
                                    >
                                        <ImagePlus className="h-5 w-5" />
                                        <span className="text-[10px] mt-1">Cover</span>
                                    </button>
                                )}
                            </div>
                            <div className="space-y-2 flex-1">
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
                                    placeholder="e.g. July 2008, 1988, 2024-01-15"
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
                                <Label htmlFor="isbn_10" className="flex items-center gap-2">
                                    ISBN-10
                                    <ScanBarcode
                                        className="h-4 w-4 text-muted-foreground"
                                    />
                                </Label>
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
                                <Label htmlFor="isbn_13" className="flex items-center gap-2">
                                    ISBN-13
                                    <ScanBarcode
                                        className="h-4 w-4 text-muted-foreground"
                                    />
                                </Label>
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
                        <p className="text-xs text-muted-foreground -mt-2">
                            Tip: USB barcode scanners can be used to quickly enter ISBNs
                        </p>
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
                                <Label htmlFor="call_number">Call Number</Label>
                                <Input
                                    id="call_number"
                                    placeholder="e.g. BF76.7.P83 2020"
                                    value={formData.call_number}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            call_number: e.target.value,
                                        }))
                                    }
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
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
                    </div>

                    <div className="p-6 pt-4 mt-auto border-t bg-background">
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
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
