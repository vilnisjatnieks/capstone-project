import { NextRequest, NextResponse } from "next/server";
import { getVerificationToken, deleteVerificationToken } from "@/lib/data/verification-tokens";
import { markEmailVerified } from "@/lib/data/users";
import { createSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/verify-email?error=invalid", request.url));
  }

  try {
    const result = await getVerificationToken(token, "email_verification");

    if (!result) {
      return NextResponse.redirect(new URL("/verify-email?error=invalid", request.url));
    }

    const { userId } = result;

    await markEmailVerified(userId);
    await deleteVerificationToken(token);

    const sessionId = await createSession(userId);

    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set("session_id", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch {
    return NextResponse.redirect(new URL("/verify-email?error=invalid", request.url));
  }
}
