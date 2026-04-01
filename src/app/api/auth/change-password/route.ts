import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, updatePasswordHash } from "@/lib/data/users";
import { getCurrentUser, verifyPassword, hashPassword } from "@/lib/auth";
import { validatePassword } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      );
    }

    // Fetch password hash
    const userRow = await findUserByEmail(currentUser.email);
    if (!userRow) {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }

    // Verify current password
    const valid = await verifyPassword(currentPassword, userRow.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    // Validate new password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: "Password does not meet requirements", errors: passwordValidation.errors },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(newPassword);
    await updatePasswordHash(currentUser.id, passwordHash);

    return NextResponse.json({ message: "Password updated" });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
