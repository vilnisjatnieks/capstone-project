"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
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
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";

interface Work {
    id: string;
    title: string;
}

interface User {
    id: string;
    name: string;
    email: string;
}

interface CheckoutFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    availableWorks: Work[];
    users: User[];
    onCreated: () => void;
    defaultWorkId?: string;
}

function defaultDueDate() {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split("T")[0];
}

export function CheckoutFormDialog({
    open,
    onOpenChange,
    availableWorks,
    users,
    onCreated,
    defaultWorkId,
}: CheckoutFormDialogProps) {
    const [workListOpen, setWorkListOpen] = useState(false);
    const [userListOpen, setUserListOpen] = useState(false);
    const [workSearch, setWorkSearch] = useState("");
    const [userSearch, setUserSearch] = useState("");
    const [formData, setFormData] = useState({
        work_id: defaultWorkId || "",
        user_id: "",
        due_date: defaultDueDate(),
    });
    const [formError, setFormError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    function handleOpenChange(nextOpen: boolean) {
        if (nextOpen) {
            setFormData({ work_id: defaultWorkId || "", user_id: "", due_date: defaultDueDate() });
            setFormError("");
            setWorkListOpen(false);
            setUserListOpen(false);
            setWorkSearch("");
            setUserSearch("");
        }
        onOpenChange(nextOpen);
    }

    async function handleCheckout(e: React.SyntheticEvent) {
        e.preventDefault();
        setSubmitting(true);
        setFormError("");

        try {
            const res = await fetch("/api/staff/checkouts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const data = await res.json();
                setFormError(data.error || "Failed to create checkout");
                return;
            }

            onOpenChange(false);
            onCreated();
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent
                className="max-w-lg"
                onOpenAutoFocus={(e) => {
                    e.preventDefault();
                    (e.currentTarget as HTMLElement).focus();
                }}
            >
                <DialogHeader>
                    <DialogTitle>Check Out Item</DialogTitle>
                    <DialogDescription>
                        Select a work and a user to create a checkout.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCheckout} className="space-y-4">
                    <div className="space-y-2">
                        <span className="text-sm font-medium">Work</span>
                        <Command className="rounded-md border" shouldFilter={workListOpen}>
                            <CommandInput
                                name="work-search"
                                placeholder="Search works..."
                                hideIcon={!workListOpen && !!formData.work_id}
                                value={workListOpen ? workSearch : (availableWorks.find((w) => w.id === formData.work_id)?.title ?? "")}
                                onValueChange={(v) => setWorkSearch(v)}
                                onFocus={() => {
                                    setWorkSearch("");
                                    setWorkListOpen(true);
                                }}
                                onBlur={() => setTimeout(() => setWorkListOpen(false), 150)}
                            />
                            {workListOpen && (
                                <CommandList>
                                    <CommandEmpty>No works found.</CommandEmpty>
                                    <CommandGroup>
                                        {availableWorks.map((work) => (
                                            <CommandItem
                                                key={work.id}
                                                value={work.title}
                                                onSelect={() => {
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        work_id: work.id,
                                                    }));
                                                    setWorkSearch("");
                                                    setWorkListOpen(false);
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        formData.work_id === work.id
                                                            ? "opacity-100"
                                                            : "opacity-0",
                                                    )}
                                                />
                                                {work.title}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            )}
                        </Command>
                    </div>
                    <div className="space-y-2">
                        <span className="text-sm font-medium">Borrower</span>
                        <Command className="rounded-md border" shouldFilter={userListOpen}>
                            <CommandInput
                                name="borrower-search"
                                placeholder="Search by name or email..."
                                hideIcon={!userListOpen && !!formData.user_id}
                                value={userListOpen ? userSearch : (() => {
                                    const u = users.find((u) => u.id === formData.user_id);
                                    return u ? `${u.name} (${u.email})` : "";
                                })()}
                                onValueChange={(v) => setUserSearch(v)}
                                onFocus={() => {
                                    setUserSearch("");
                                    setUserListOpen(true);
                                }}
                                onBlur={() => setTimeout(() => setUserListOpen(false), 150)}
                            />
                            {userListOpen && (
                                <CommandList>
                                    <CommandEmpty>No users found.</CommandEmpty>
                                    <CommandGroup>
                                        {users.map((user) => (
                                            <CommandItem
                                                key={user.id}
                                                value={`${user.name} ${user.email}`}
                                                onSelect={() => {
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        user_id: user.id,
                                                    }));
                                                    setUserSearch("");
                                                    setUserListOpen(false);
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        formData.user_id === user.id
                                                            ? "opacity-100"
                                                            : "opacity-0",
                                                    )}
                                                />
                                                {user.name} ({user.email})
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            )}
                        </Command>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="due_date">
                            Due Date{" "}
                            <span className="text-muted-foreground font-normal">(30 days by default)</span>
                        </Label>
                        <Input
                            id="due_date"
                            type="date"
                            required
                            value={formData.due_date}
                            onChange={(e) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    due_date: e.target.value,
                                }))
                            }
                        />
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
                        <Button
                            type="submit"
                            disabled={submitting || !formData.work_id || !formData.user_id}
                        >
                            {submitting ? "Checking out..." : "Check Out"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
