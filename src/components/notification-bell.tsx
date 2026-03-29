"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Notification {
    id: string;
    message: string;
    checkout_id: string | null;
    created_at: string;
}

export function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        fetch("/api/notifications")
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data)) setNotifications(data);
            })
            .catch(() => {});
    }, []);

    async function markRead(id: string) {
        await fetch(`/api/notifications/${id}/read`, { method: "PUT" });
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }

    async function markAllRead() {
        await fetch("/api/notifications/read-all", { method: "PUT" });
        setNotifications([]);
    }

    const count = notifications.length;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="relative text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
                    aria-label="Notifications"
                >
                    <Bell className="h-4 w-4" />
                    {count > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                            {count > 9 ? "9+" : count}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                {count === 0 ? (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                        No new notifications
                    </div>
                ) : (
                    <>
                        {notifications.map((n) => (
                            <DropdownMenuItem
                                key={n.id}
                                className="flex cursor-pointer flex-col items-start gap-1 px-3 py-2 whitespace-normal"
                                onClick={() => markRead(n.id)}
                            >
                                <span className="text-sm">{n.message}</span>
                                <span className="text-xs text-muted-foreground">
                                    {new Date(n.created_at).toLocaleDateString()}
                                </span>
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="cursor-pointer justify-center text-sm text-muted-foreground"
                            onClick={markAllRead}
                        >
                            Mark all as read
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
