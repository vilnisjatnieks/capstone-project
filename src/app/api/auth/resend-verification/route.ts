import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/data/users";
import { createVerificationToken } from "@/lib/data/verification-tokens";
import { sendVerificationEmail } from "@/lib/email";

const GENERIC_RESPONSE = {
  message: "If your email is registered and unverified, a new link has been sent.",
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
    if (!user || user.email_verified_at) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const token = await createVerificationToken(user.id, "email_verification", expiresAt);
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const verificationUrl = `${appUrl}/api/auth/verify-email?token=${token}`;
    await sendVerificationEmail(email, user.name, verificationUrl);

    return NextResponse.json(GENERIC_RESPONSE);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
