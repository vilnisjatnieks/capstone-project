"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2 } from "lucide-react";
import { Search } from "lucide-react";
import { TagFormDialog } from "./tag-form-dialog";
import { DeleteTagDialog } from "./delete-tag-dialog";

interface Tag {
    id: string;
    name: string;
    color: string | null;
    created_at: string;
    updated_at: string;
}

interface StaffTagsClientProps {
    initialTags: Tag[];
}

export function StaffTagsClient({ initialTags }: StaffTagsClientProps) {
    const router = useRouter();
    const [tags, setTags] = useState<Tag[]>(initialTags);
    const [search, setSearch] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [editingTag, setEditingTag] = useState<Tag | null>(null);
    const [deletingTag, setDeletingTag] = useState<Tag | null>(null);

    const filteredTags = useMemo(() => {
        return tags.filter((tag) => {
            return (
                !search ||
                tag.name.toLowerCase().includes(search.toLowerCase())
            );
        });
    }, [tags, search]);

    function openAddDialog() {
        setEditingTag(null);
        setFormOpen(true);
    }

    function openEditDialog(tag: Tag) {
        setEditingTag(tag);
        setFormOpen(true);
    }

    function openDeleteDialog(tag: Tag) {
        setDeletingTag(tag);
        setDeleteOpen(true);
    }

    function handleSaved(tag: Tag, isNew: boolean) {
        if (isNew) {
            setTags((prev) => [tag, ...prev]);
        } else {
            setTags((prev) => prev.map((t) => (t.id === tag.id ? tag : t)));
        }
        router.refresh();
    }

    function handleDeleted(id: string) {
        setTags((prev) => prev.filter((t) => t.id !== id));
        router.refresh();
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <Button onClick={openAddDialog}>Add Tag</Button>
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="tags-search"
                        placeholder="Search by tag name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Color</TableHead>
                        <TableHead className="w-[70px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredTags.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground">
                                No tags found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        filteredTags.map((tag) => (
                            <TableRow key={tag.id}>
                                <TableCell className="font-medium">{tag.name}</TableCell>
                                <TableCell>
                                    {tag.color ? (
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-6 h-6 rounded border"
                                                style={{ backgroundColor: tag.color }}
                                            />
                                            <span className="text-sm text-muted-foreground">
                                                {tag.color}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground">—</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(tag)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => openDeleteDialog(tag)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            <TagFormDialog
                open={formOpen}
                onOpenChange={setFormOpen}
                editingTag={editingTag}
                onSaved={handleSaved}
            />

            <DeleteTagDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                tag={deletingTag}
                onDeleted={handleDeleted}
            />
        </div>
    );
}
