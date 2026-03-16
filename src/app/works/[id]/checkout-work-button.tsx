"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CopyPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CheckoutFormDialog } from "@/app/staff/checkout-form-dialog";

export interface CheckoutWorkButtonProps {
    work: any;
    users: any[];
    disabled?: boolean;
}

export function CheckoutWorkButton({ work, users, disabled }: CheckoutWorkButtonProps) {
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const router = useRouter();

    const handleCreated = () => {
        setIsCheckingOut(false);
        router.refresh(); // Refresh the data to show updates
    };

    return (
        <>
            <Button
                size="sm"
                onClick={() => setIsCheckingOut(true)}
                className="gap-2"
                disabled={disabled}
            >
                <CopyPlus className="h-4 w-4" />
                {disabled ? "Checked Out" : "Check Out"}
            </Button>

            <CheckoutFormDialog
                open={isCheckingOut}
                onOpenChange={setIsCheckingOut}
                availableWorks={[{ id: work.id, title: work.title }]}
                users={users}
                onCreated={handleCreated}
                defaultWorkId={work.id}
            />
        </>
    );
}

