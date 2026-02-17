"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

interface StaffWorksClientProps {
    initialWorks: Work[];
}

const MEDIA_TYPES = ["book", "ebook", "audiobook", "periodical", "dvd", "other"];

export function StaffWorksClient({ initialWorks }: StaffWorksClientProps) {
    const router = useRouter();
    const [works, setWorks] = useState<Work[]>(initialWorks);
    const [search, setSearch] = useState("");
    const [mediaFilter, setMediaFilter] = useState("all");
    const [formOpen, setFormOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [editingWork, setEditingWork] = useState<Work | null>(null);
    const [deletingWork, setDeletingWork] = useState<Work | null>(null);
    const [formError, setFormError] = useState("");
    const [submitting, setSubmitting] = useState(false);

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

    const [formData, setFormData] = useState(emptyForm);

    const filteredWorks = useMemo(() => {
        return works.filter((work) => {
            const matchesSearch =
                !search ||
                work.title.toLowerCase().includes(search.toLowerCase()) ||
                (work.publisher ?? "").toLowerCase().includes(search.toLowerCase());
            const matchesMedia =
                mediaFilter === "all" || work.media_type === mediaFilter;
            return matchesSearch && matchesMedia;
        });
    }, [works, search, mediaFilter]);

    function openAddDialog() {
        setEditingWork(null);
        setFormData(emptyForm);
        setFormError("");
        setFormOpen(true);
    }

    function openEditDialog(work: Work) {
        setEditingWork(work);
        setFormData({
            title: work.title,
            date_published: work.date_published ?? "",
            publisher: work.publisher ?? "",
            editor: work.editor ?? "",
            lccn: work.lccn ?? "",
            isbn_10: work.isbn_10 ?? "",
            isbn_13: work.isbn_13 ?? "",
            media_type: work.media_type ?? "",
            number_of_pages: work.number_of_pages?.toString() ?? "",
            language: work.language ?? "",
            location: work.location ?? "",
        });
        setFormError("");
        setFormOpen(true);
    }

    function openDeleteDialog(work: Work) {
        setDeletingWork(work);
        setDeleteOpen(true);
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

                if (Object.keys(updates).length === 0) {
                    setFormOpen(false);
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
                setWorks((prev) =>
                    prev.map((w) => (w.id === updated.id ? updated : w))
                );
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
                setWorks((prev) => [created, ...prev]);
            }

            setFormOpen(false);
            router.refresh();
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete() {
        if (!deletingWork) return;
        setSubmitting(true);

        try {
            const res = await fetch(`/api/staff/works/${deletingWork.id}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const data = await res.json();
                setFormError(data.error || "Failed to delete work");
                return;
            }

            setWorks((prev) => prev.filter((w) => w.id !== deletingWork.id));
            setDeleteOpen(false);
            router.refresh();
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <Button onClick={openAddDialog}>Add Item</Button>
                <Input
                    placeholder="Search by title or publisher..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-sm"
                />
                <Select value={mediaFilter} onValueChange={setMediaFilter}>
                    <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Filter media type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {MEDIA_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Publisher</TableHead>
                        <TableHead>Media Type</TableHead>
                        <TableHead>Date Published</TableHead>
                        <TableHead>Pages</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="w-[70px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredWorks.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                                No works found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        filteredWorks.map((work) => (
                            <TableRow key={work.id}>
                                <TableCell className="font-medium">{work.title}</TableCell>
                                <TableCell>{work.publisher ?? "—"}</TableCell>
                                <TableCell>{work.media_type ?? "—"}</TableCell>
                                <TableCell>{work.date_published ? new Date(work.date_published).toLocaleDateString() : "—"}</TableCell>
                                <TableCell>{work.number_of_pages ?? "—"}</TableCell>
                                <TableCell>{work.location ?? "—"}</TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm">
                                                ...
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => openEditDialog(work)}>
                                                Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => openDeleteDialog(work)}
                                                className="text-destructive"
                                            >
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            {/* Add / Edit Dialog */}
            <Dialog open={formOpen} onOpenChange={setFormOpen}>
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
                                <Label htmlFor="media_type">Media Type</Label>
                                <Select
                                    value={formData.media_type}
                                    onValueChange={(value) =>
                                        setFormData((prev) => ({ ...prev, media_type: value }))
                                    }
                                >
                                    <SelectTrigger>
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
                                onClick={() => setFormOpen(false)}
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

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Work</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete &quot;{deletingWork?.title}&quot;?
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    {formError && (
                        <p className="text-sm text-destructive">{formError}</p>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteOpen(false)}>
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
        </div>
    );
}
