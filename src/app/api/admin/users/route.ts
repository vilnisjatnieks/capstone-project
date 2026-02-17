import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const check = await requireAdmin();
  if (!check.authorized) return check.response;

  const result = await query(
    "SELECT id, email, name, role, created_at, updated_at FROM users ORDER BY created_at DESC"
  );

  return NextResponse.json(result.rows);
}

export async function POST(request: NextRequest) {
  const check = await requireAdmin();
  if (!check.authorized) return check.response;

  const body = await request.json();
  const { email, name, password, role } = body;

  if (!email || !name || !password) {
    return NextResponse.json(
      { error: "Email, name, and password are required" },
      { status: 400 }
    );
  }

  const existing = await query("SELECT id FROM users WHERE email = $1", [
    email,
  ]);
  if (existing.rows.length > 0) {
    return NextResponse.json(
      { error: "Email already in use" },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  const userRole = role || "user";

  const result = await query(
    `INSERT INTO users (email, name, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, name, role, created_at, updated_at`,
    [email, name, passwordHash, userRole]
  );

  return NextResponse.json(result.rows[0], { status: 201 });
}
