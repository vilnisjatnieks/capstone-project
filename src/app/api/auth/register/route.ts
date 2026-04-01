import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, registerUser } from "@/lib/data/users";
import { hashPassword } from "@/lib/auth";
import { validatePassword, validateEmail } from "@/lib/validation";
import { createVerificationToken } from "@/lib/data/verification-tokens";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    // Validate required fields
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    // Validate email format
    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: "Password does not meet requirements", errors: passwordValidation.errors },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const user = await registerUser(email, name, passwordHash);

    // Create verification token (24h expiry) and send email
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const token = await createVerificationToken(user.id, "email_verification", expiresAt);
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const verificationUrl = `${appUrl}/api/auth/verify-email?token=${token}`;
    const emailSent = await sendVerificationEmail(email, name, verificationUrl);

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        emailSent,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
