import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, registerUser } from "@/lib/data/users";
import { hashPassword, createSession } from "@/lib/auth";
import { cookies } from "next/headers";
import { validatePassword, validateEmail } from "@/lib/validation";

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

    // Hash password
    const passwordHash = await hashPassword(password);

    // Insert new user
    const user = await registerUser(email, name, passwordHash);

    // Create session
    const sessionId = await createSession(user.id);

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set("session_id", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    });

    // Return user data (no password_hash)
    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
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
