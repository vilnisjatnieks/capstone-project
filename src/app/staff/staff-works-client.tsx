"use client";

import { useState, useMemo, useRef } from "react";
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
import { Search, Upload, Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
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
    const [importing, setImporting] = useState(false);
    const [dragging, setDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    async function handleImportFile(file: File) {
        if (!file) return;
        setImporting(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/staff/works/import", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error ?? "Import failed");
                return;
            }
            const { imported, skipped } = data as {
                imported: number;
                skipped: { row: number; reason: string }[];
            };
            if (skipped.length === 0) {
                toast.success(`${imported} work${imported !== 1 ? "s" : ""} imported`);
            } else {
                const rowList = skipped.map((s) => `row ${s.row} — ${s.reason}`).join(", ");
                toast.success(
                    `${imported} imported, ${skipped.length} skipped (${rowList})`
                );
            }
            const worksRes = await fetch("/api/staff/works");
            if (worksRes.ok) {
                const updatedWorks = await worksRes.json();
                setWorks(updatedWorks);
            }
        } catch {
            toast.error("Import failed");
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }

    async function handleExport() {
        try {
            const res = await fetch("/api/staff/works/export");
            if (!res.ok) {
                toast.error("Export failed");
                return;
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "works-export.xlsx";
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error("Export failed");
        }
    }

    async function handleTemplateDownload() {
        try {
            const res = await fetch("/api/staff/works/template");
            if (!res.ok) {
                toast.error("Template download failed");
                return;
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "works-import-template.xlsx";
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error("Template download failed");
        }
    }

    function handleDragOver(e: React.DragEvent) {
        e.preventDefault();
        setDragging(true);
    }

    function handleDragLeave() {
        setDragging(false);
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleImportFile(file);
    }

    return (
        <div
            className={`space-y-4 relative${dragging ? " outline-dashed outline-2 outline-primary rounded-md" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {dragging && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 rounded-md pointer-events-none">
                    <p className="text-primary font-medium text-lg">Drop Excel file to import</p>
                </div>
            )}
            <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImportFile(file);
                }}
            />
            <div className="flex items-center gap-4">
                <Button onClick={openAddDialog}>Add Work</Button>
                <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                >
                    <Upload className="h-4 w-4 mr-2" />
                    {importing ? "Importing…" : "Import Excel"}
                </Button>
                <Button variant="outline" onClick={handleExport}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Excel
                </Button>
                <Button variant="outline" onClick={handleTemplateDownload}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Template
                </Button>
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
