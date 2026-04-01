import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { markAllNotificationsRead } from "@/lib/data/notifications";

export async function PUT() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await markAllNotificationsRead(user.id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to mark all notifications as read:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
