import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requireAdmin();
  if (!check.authorized) return check.response;

  const { id } = await params;
  const body = await request.json();
  const { email, name, role, password } = body;

  if (!email && !name && !role && !password) {
    return NextResponse.json(
      { error: "At least one field is required" },
      { status: 400 }
    );
  }

  if (role && id === check.user.id) {
    return NextResponse.json(
      { error: "Cannot change your own role" },
      { status: 400 }
    );
  }

  if (email) {
    const existing = await query(
      "SELECT id FROM users WHERE email = $1 AND id != $2",
      [email, id]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 }
      );
    }
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (email) {
    fields.push(`email = $${paramIndex++}`);
    values.push(email);
  }
  if (name) {
    fields.push(`name = $${paramIndex++}`);
    values.push(name);
  }
  if (role) {
    fields.push(`role = $${paramIndex++}`);
    values.push(role);
  }
  if (password) {
    const passwordHash = await hashPassword(password);
    fields.push(`password_hash = $${paramIndex++}`);
    values.push(passwordHash);
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query(
    `UPDATE users SET ${fields.join(", ")} WHERE id = $${paramIndex}
     RETURNING id, email, name, role, created_at, updated_at`,
    values
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(result.rows[0]);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requireAdmin();
  if (!check.authorized) return check.response;

  const { id } = await params;

  if (id === check.user.id) {
    return NextResponse.json(
      { error: "Cannot delete your own account" },
      { status: 400 }
    );
  }

  const result = await query(
    "DELETE FROM users WHERE id = $1 RETURNING id",
    [id]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
