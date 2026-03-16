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
import { Search } from "lucide-react";
import { WorkFormDialog } from "./work-form-dialog";
import { DeleteWorkDialog } from "./delete-work-dialog";

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
        setFormOpen(true);
    }

    function openEditDialog(work: Work) {
        setEditingWork(work);
        setFormOpen(true);
    }

    function openDeleteDialog(work: Work) {
        setDeletingWork(work);
        setDeleteOpen(true);
    }

    function handleSaved(work: Work, isNew: boolean) {
        if (isNew) {
            setWorks((prev) => [work, ...prev]);
        } else {
            setWorks((prev) => prev.map((w) => (w.id === work.id ? work : w)));
        }
        router.refresh();
    }

    function handleDeleted(id: string) {
        setWorks((prev) => prev.filter((w) => w.id !== id));
        router.refresh();
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <Button onClick={openAddDialog}>Add Work</Button>
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="works-search"
                        placeholder="Search by title or publisher..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select name="media-filter" value={mediaFilter} onValueChange={setMediaFilter}>
                    <SelectTrigger id="media-filter" className="w-[160px]">
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
                        <TableHead>Call Number</TableHead>
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
                            <TableRow
                                key={work.id}
                                className="cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => router.push(`/works/${work.id}`)}
                            >
                                <TableCell className="font-medium">{work.title}</TableCell>
                                <TableCell>{work.publisher ?? "—"}</TableCell>
                                <TableCell>{work.call_number ?? "—"}</TableCell>
                                <TableCell>{work.date_published ? work.date_published : "—"}</TableCell>
                                <TableCell>{work.number_of_pages ?? "—"}</TableCell>
                                <TableCell>{work.location ?? "—"}</TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
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

            <WorkFormDialog
                open={formOpen}
                onOpenChange={setFormOpen}
                editingWork={editingWork}
                onSaved={handleSaved}
            />

            <DeleteWorkDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                work={deletingWork}
                onDeleted={handleDeleted}
            />
        </div>
    );
}
