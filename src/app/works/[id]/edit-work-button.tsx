"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WorkFormDialog } from "@/app/staff/work-form-dialog";

export interface EditWorkButtonProps {
    work: any;
}

export function EditWorkButton({ work }: EditWorkButtonProps) {
    const [isEditing, setIsEditing] = useState(false);
    const router = useRouter();

    const handleSaved = () => {
        setIsEditing(false);
        router.refresh(); // Refresh the data to show updates
    };

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="gap-2"
            >
                <Edit className="h-4 w-4" />
                Edit
            </Button>

            <WorkFormDialog
                open={isEditing}
                onOpenChange={setIsEditing}
                editingWork={work}
                onSaved={handleSaved}
            />
        </>
    );
}
