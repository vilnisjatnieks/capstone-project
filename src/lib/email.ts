import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function sendReminderEmail(
    userEmail: string,
    userName: string,
    workTitle: string,
    dueDate: string
) {
    if (!resend) {
        console.warn(
            "RESEND_API_KEY is not set. Mocking email send to:",
            userEmail
        );
        console.log(`
Subject: Return Reminder: ${workTitle}
To: ${userName} <${userEmail}>
Body:
Hi ${userName},

This is a reminder that the work "${workTitle}" is due on ${new Date(
            dueDate
        ).toLocaleDateString()}. Please remember to return it.

Thanks!
        `);
        return true;
    }

    try {
        const { error } = await resend.emails.send({
            from: "Acme <onboarding@resend.dev>", // Replace with a verified domain
            to: [userEmail],
            subject: `Return Reminder: ${workTitle}`,
            html: `
                <p>Hi ${userName},</p>
                <p>This is a reminder that the work <strong>"${workTitle}"</strong> is due on <strong>${new Date(
                dueDate
            ).toLocaleDateString()}</strong>. Please remember to return it.</p>
                <p>Thanks!</p>
            `,
        });

        if (error) {
            console.error("Error sending email via Resend:", error);
            return false;
        }

        return true;
    } catch (err) {
        console.error("Unexpected error sending email:", err);
        return false;
    }
}
