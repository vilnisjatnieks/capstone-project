"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";

export function LogoutButton() {
    const [open, setOpen] = useState(false);
    const router = useRouter();

    async function handleLogout() {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
    }

    return (
        <>
            <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
                Sign Out
            </Button>
            <ConfirmDialog
                open={open}
                onOpenChange={setOpen}
                title="Sign out?"
                description="You'll be returned to the sign-in page."
                confirmLabel="Sign out"
                onConfirm={handleLogout}
            />
        </>
    );
}
