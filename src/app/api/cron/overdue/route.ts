import { NextRequest, NextResponse } from "next/server";
import {
    getOverdueCheckouts,
    markOverdueNotified,
} from "@/lib/data/checkouts";
import { getStaffAndAdminUsers } from "@/lib/data/users";
import { createNotification } from "@/lib/data/notifications";

export async function GET(req: NextRequest) {
    // 1. Authorization check based on CRON_SECRET
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    if (token !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // 2. Fetch all newly overdue checkouts
        const overdueCheckouts = await getOverdueCheckouts();

        if (overdueCheckouts.length === 0) {
            return NextResponse.json({ message: "No overdue checkouts", processed: 0 });
        }

        // 3. Fetch staff/admin users once
        const staffUsers = await getStaffAndAdminUsers();

        // 4. For each overdue checkout, notify the borrower and all staff
        for (const checkout of overdueCheckouts) {
            const dueDate = new Date(checkout.due_date).toLocaleDateString();

            // Notify the borrower
            await createNotification(
                checkout.user_id,
                `Your copy of "${checkout.work_title}" was due on ${dueDate} and is now overdue. Please return it as soon as possible.`,
                checkout.id
            );

            // Notify each staff/admin user
            for (const staff of staffUsers) {
                await createNotification(
                    staff.id,
                    `"${checkout.work_title}" checked out by ${checkout.user_name} was due on ${dueDate} and is now overdue.`,
                    checkout.id
                );
            }

            // Mark to prevent re-triggering
            await markOverdueNotified(checkout.id);
        }

        return NextResponse.json({
            message: "Overdue notifications created",
            processed: overdueCheckouts.length,
        });
    } catch (error) {
        console.error("Failed to process overdue notifications:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
