"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckoutDTO } from "@/lib/data/checkouts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setSuccess(false);
        setLoading(true);

        try {
            const res = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword }),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Failed to update password");
                return;
            }

            setSuccess(true);
            setCurrentPassword("");
            setNewPassword("");
        } catch {
            setError("An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
            {success && (
                <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">
                    Password updated successfully.
                </div>
            )}
            {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                </div>
            )}
            <div className="space-y-2">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                />
            </div>
            <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
            </Button>
        </form>
    );
}

export function ProfileClient({
    initialCheckouts,
}: {
    initialCheckouts: CheckoutDTO[];
}) {
    const [checkouts, setCheckouts] = useState<CheckoutDTO[]>(initialCheckouts);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleRequestExtension = async (id: string) => {
        setLoadingId(id);
        setError(null);

        try {
            const response = await fetch(`/api/checkouts/${id}/extend/request`, {
                method: "POST",
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to request extension");
            }

            const data = await response.json();

            // Update the checkouts list optimistic or with actual data
            setCheckouts((prev) =>
                prev.map((c) =>
                    c.id === id ? { ...c, extension_status: data.checkout.extension_status } : c
                )
            );
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoadingId(null);
        }
    };

    if (checkouts.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground border rounded-lg bg-card mt-4">
                You do not have any checkouts.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {error && (
                <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md">
                    {error}
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {checkouts.map((checkout) => {
                    const isReturned = checkout.returned_at !== null;
                    const dueDate = new Date(checkout.due_date).toLocaleDateString();
                    const isOverdue = !isReturned && new Date(checkout.due_date) < new Date();

                    return (
                        <Link key={checkout.id} href={`/works/${checkout.work_id}`} className="block bg-card border rounded-lg p-5 shadow-sm space-y-3 hover:shadow-md transition-shadow">
                            <div>
                                <h3 className="font-semibold text-lg line-clamp-2" title={checkout.work_title}>
                                    {checkout.work_title}
                                </h3>
                            </div>

                            <div className="text-sm space-y-1">
                                <p className="text-muted-foreground">
                                    Checked out: {new Date(checkout.checked_out_at).toLocaleDateString()}
                                </p>
                                {!isReturned && (
                                    <p className={`font-medium ${isOverdue ? 'text-destructive' : ''}`}>
                                        Due: {dueDate} {isOverdue && "(Overdue)"}
                                    </p>
                                )}
                                {isReturned && (
                                    <p className="text-green-600 dark:text-green-500 font-medium">
                                        Returned: {new Date(checkout.returned_at!).toLocaleDateString()}
                                    </p>
                                )}
                            </div>

                            <div className="pt-2 border-t flex items-center justify-between">
                                {!isReturned && (
                                    <>
                                        {/* Status Displays */}
                                        {checkout.extension_status === "pending" && (
                                            <span className="text-sm text-yellow-600 dark:text-yellow-500 font-medium">
                                                Extension Pending
                                            </span>
                                        )}
                                        {checkout.extension_status === "approved" && (
                                            <span className="text-sm text-green-600 dark:text-green-500 font-medium">
                                                Extension Approved
                                            </span>
                                        )}
                                        {checkout.extension_status === "rejected" && (
                                            <span className="text-sm text-destructive font-medium">
                                                Extension Rejected
                                            </span>
                                        )}
                                        {checkout.extension_status === "none" && (
                                            <span className="text-sm text-muted-foreground">
                                                No extension
                                            </span>
                                        )}

                                        {/* Action Button */}
                                        {checkout.extension_status === "none" && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleRequestExtension(checkout.id)}
                                                disabled={loadingId === checkout.id}
                                            >
                                                {loadingId === checkout.id ? "Requesting..." : "Request Extension"}
                                            </Button>
                                        )}
                                    </>
                                )}
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div >
    );
}
