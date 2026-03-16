"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ReturnCheckoutDialog } from "@/app/staff/return-checkout-dialog";
import { CheckoutDTO } from "@/lib/data/checkouts";

export interface ReturnWorkButtonProps {
    checkout: CheckoutDTO;
}

export function ReturnWorkButton({ checkout }: ReturnWorkButtonProps) {
    const [open, setOpen] = useState(false);
    const router = useRouter();

    return (
        <>
            <Button
                size="sm"
                variant="outline"
                onClick={() => setOpen(true)}
                className="gap-2"
            >
                <Undo2 className="h-4 w-4" />
                Return Book
            </Button>
            <ReturnCheckoutDialog
                open={open}
                onOpenChange={setOpen}
                checkout={{
                    id: checkout.id,
                    work_title: checkout.work_title,
                    user_name: checkout.user_name,
                }}
                onReturned={() => router.refresh()}
            />
        </>
    );
}
