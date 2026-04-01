import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/data/users";
import { createVerificationToken } from "@/lib/data/verification-tokens";
import { sendPasswordResetEmail } from "@/lib/email";

const GENERIC_RESPONSE = {
  message: "If your email is registered, a reset link has been sent.",
};

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const user = await findUserByEmail(email);

    // Always return 200 — prevents email enumeration
    if (!user) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const token = await createVerificationToken(user.id, "password_reset", expiresAt);
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password?token=${token}`;
    await sendPasswordResetEmail(email, user.name, resetUrl);

    return NextResponse.json(GENERIC_RESPONSE);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
