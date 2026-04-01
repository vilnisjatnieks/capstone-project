import { NextRequest, NextResponse } from "next/server";
import { getVerificationToken, deleteVerificationToken } from "@/lib/data/verification-tokens";
import { updatePasswordHash } from "@/lib/data/users";
import { hashPassword } from "@/lib/auth";
import { validatePassword } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    const result = await getVerificationToken(token, "password_reset");
    if (!result) {
      return NextResponse.json(
        { error: "Invalid or expired reset link" },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: "Password does not meet requirements", errors: passwordValidation.errors },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    await updatePasswordHash(result.userId, passwordHash);
    await deleteVerificationToken(token);

    return NextResponse.json({ message: "Password updated" });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
