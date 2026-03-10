import { NextRequest, NextResponse } from "next/server";
import {
    getCheckoutsNeedingReminders,
    markReminderSent,
} from "@/lib/data/checkouts";
import { sendReminderEmail } from "@/lib/email";

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
        // 2. Query checkouts that are due in 3 days or fewer
        // We can pass `3` here to remind folks who are within 3 days
        const checkouts = await getCheckoutsNeedingReminders(3);

        const results = [];

        for (const checkout of checkouts) {
            // 3. Send email via Resend
            const emailSent = await sendReminderEmail(
                checkout.user_email,
                checkout.user_name,
                checkout.work_title,
                checkout.due_date
            );

            if (emailSent) {
                // 4. Mark the DB so we don't remind again
                await markReminderSent(checkout.id);
                results.push({
                    checkoutId: checkout.id,
                    email: checkout.user_email,
                    status: "sent",
                });
            } else {
                results.push({
                    checkoutId: checkout.id,
                    email: checkout.user_email,
                    status: "failed",
                });
            }
        }

        return NextResponse.json({
            message: "Reminders processed",
            processed: checkouts.length,
            details: results,
        });
    } catch (error) {
        console.error("Failed to process reminders:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
