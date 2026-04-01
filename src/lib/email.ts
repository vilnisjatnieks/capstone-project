import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";

export async function sendVerificationEmail(
    userEmail: string,
    userName: string,
    verificationUrl: string
): Promise<boolean> {
    if (!resend) {
        console.warn(
            "RESEND_API_KEY is not set. Mocking verification email to:",
            userEmail
        );
        console.log(`
Subject: Verify your email address
To: ${userName} <${userEmail}>
Body:
Hi ${userName},

Please verify your email address by clicking the link below:
${verificationUrl}

This link expires in 24 hours.

Thanks!
        `);
        return true;
    }

    try {
        const { error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [userEmail],
            subject: "Verify your email address",
            html: `
                <p>Hi ${userName},</p>
                <p>Please verify your email address by clicking the link below:</p>
                <p><a href="${verificationUrl}">${verificationUrl}</a></p>
                <p>This link expires in 24 hours.</p>
                <p>Thanks!</p>
            `,
        });

        if (error) {
            console.error("Error sending verification email via Resend:", error);
            return false;
        }

        return true;
    } catch (err) {
        console.error("Unexpected error sending verification email:", err);
        return false;
    }
}

export async function sendPasswordResetEmail(
    userEmail: string,
    userName: string,
    resetUrl: string
): Promise<boolean> {
    if (!resend) {
        console.warn(
            "RESEND_API_KEY is not set. Mocking password reset email to:",
            userEmail
        );
        console.log(`
Subject: Reset your password
To: ${userName} <${userEmail}>
Body:
Hi ${userName},

You requested a password reset. Click the link below to set a new password:
${resetUrl}

This link expires in 1 hour. If you didn't request this, you can ignore this email.

Thanks!
        `);
        return true;
    }

    try {
        const { error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [userEmail],
            subject: "Reset your password",
            html: `
                <p>Hi ${userName},</p>
                <p>You requested a password reset. Click the link below to set a new password:</p>
                <p><a href="${resetUrl}">${resetUrl}</a></p>
                <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
                <p>Thanks!</p>
            `,
        });

        if (error) {
            console.error("Error sending password reset email via Resend:", error);
            return false;
        }

        return true;
    } catch (err) {
        console.error("Unexpected error sending password reset email:", err);
        return false;
    }
}

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
            from: FROM_EMAIL,
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
