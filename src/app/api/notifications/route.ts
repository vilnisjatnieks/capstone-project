import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUnreadNotifications } from "@/lib/data/notifications";

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const notifications = await getUnreadNotifications(user.id);
        return NextResponse.json(notifications);
    } catch (error) {
        console.error("Failed to fetch notifications:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
