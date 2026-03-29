"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { CheckoutDTO } from "@/lib/data/checkouts";

interface WorkCheckoutHistoryProps {
    checkouts: CheckoutDTO[];
}

function getStatus(checkout: CheckoutDTO): {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
} {
    if (checkout.returned_at) {
        return { label: "Returned", variant: "secondary" };
    }
    if (new Date(checkout.due_date) < new Date()) {
        return { label: "Overdue", variant: "destructive" };
    }
    return { label: "Active", variant: "default" };
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

export function WorkCheckoutHistory({ checkouts }: WorkCheckoutHistoryProps) {
    const [open, setOpen] = useState(false);

    return (
        <div className="mt-10 border rounded-lg overflow-hidden">
            <button
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted transition-colors text-sm font-medium"
            >
                <span>Checkout History ({checkouts.length})</span>
                {open ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
            </button>

            {open && (
                <div className="p-4">
                    {checkouts.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            No checkout history yet.
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Borrower</TableHead>
                                    <TableHead>Checked Out</TableHead>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead>Returned</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {checkouts.map((checkout) => {
                                    const status = getStatus(checkout);
                                    return (
                                        <TableRow key={checkout.id}>
                                            <TableCell>
                                                <div className="font-medium">{checkout.user_name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {checkout.user_email}
                                                </div>
                                            </TableCell>
                                            <TableCell>{formatDate(checkout.checked_out_at)}</TableCell>
                                            <TableCell>{formatDate(checkout.due_date)}</TableCell>
                                            <TableCell>{formatDate(checkout.returned_at)}</TableCell>
                                            <TableCell>
                                                <Badge variant={status.variant}>{status.label}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </div>
            )}
        </div>
    );
}
