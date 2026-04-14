"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface Tag {
    id: string;
    name: string;
    color: string | null;
}

interface WorkTagsEditorProps {
    workId: string;
    currentTags: Tag[];
    allTags: Tag[];
}

export function WorkTagsEditor({ workId, currentTags, allTags }: WorkTagsEditorProps) {
    const router = useRouter();
    const [tags, setTags] = useState<Tag[]>(currentTags);
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [pendingRemoval, setPendingRemoval] = useState<Tag | null>(null);

    const availableTags = allTags.filter(
        (t) => !tags.some((ct) => ct.id === t.id)
    );

    async function handleAdd(tagId: string) {
        setPopoverOpen(false);
        try {
            const res = await fetch(`/api/staff/works/${workId}/tags`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tag_id: tagId }),
            });

            if (res.ok) {
                const addedTag = allTags.find((t) => t.id === tagId);
                if (addedTag) {
                    setTags((prev) => [...prev, addedTag]);
                    toast.success(`Tag "${addedTag.name}" added`);
                }
                router.refresh();
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.error || "Failed to add tag");
            }
        } catch {
            toast.error("Failed to add tag");
        }
    }

    async function handleRemoveConfirmed() {
        if (!pendingRemoval) return;
        const res = await fetch(`/api/staff/works/${workId}/tags`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tag_id: pendingRemoval.id }),
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Failed to remove tag");
        }

        const removedName = pendingRemoval.name;
        setTags((prev) => prev.filter((t) => t.id !== pendingRemoval.id));
        toast.success(`Tag "${removedName}" removed`);
        router.refresh();
    }

    return (
        <>
            {tags.map((tag) => (
                <Badge
                    key={tag.id}
                    className="px-3 py-1 text-sm rounded-full flex items-center gap-1 cursor-default"
                    style={tag.color ? { backgroundColor: tag.color, color: "#fff" } : undefined}
                >
                    {tag.name}
                    <button
                        className="ml-1 rounded-full hover:bg-black/20 p-0.5 transition-colors"
                        onClick={() => setPendingRemoval(tag)}
                        aria-label={`Remove tag ${tag.name}`}
                    >
                        <X className="h-3 w-3" />
                    </button>
                </Badge>
            ))}
            {availableTags.length > 0 && (
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 rounded-full px-2 text-xs gap-1"
                        >
                            <Plus className="h-3 w-3" />
                            Tag
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-52 p-0" align="start">
                        <Command>
                            <CommandInput placeholder="Search tags..." />
                            <CommandList>
                                <CommandEmpty>No tags found.</CommandEmpty>
                                <CommandGroup>
                                    {availableTags.map((tag) => (
                                        <CommandItem
                                            key={tag.id}
                                            value={tag.name}
                                            onSelect={() => handleAdd(tag.id)}
                                        >
                                            {tag.color && (
                                                <div
                                                    className="w-3 h-3 rounded-full border shrink-0"
                                                    style={{ backgroundColor: tag.color }}
                                                />
                                            )}
                                            {tag.name}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            )}
            <ConfirmDialog
                open={pendingRemoval !== null}
                onOpenChange={(open) => { if (!open) setPendingRemoval(null); }}
                title="Remove tag?"
                description={`Remove "${pendingRemoval?.name}" from this work?`}
                confirmLabel="Remove"
                destructive
                onConfirm={handleRemoveConfirmed}
            />
        </>
    );
}
