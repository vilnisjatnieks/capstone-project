import { NextRequest, NextResponse } from "next/server";
import { updateUser, deleteUser } from "@/lib/data/users";

function mapErrorToResponse(error: unknown): NextResponse {
  const message =
    error instanceof Error ? error.message : "Internal server error";
  if (message === "Unauthorized") {
    return NextResponse.json({ error: message }, { status: 401 });
  }
  if (message === "Forbidden") {
    return NextResponse.json({ error: message }, { status: 403 });
  }
  if (
    message === "At least one field is required" ||
    message === "Cannot change your own role" ||
    message === "Cannot delete your own account"
  ) {
    return NextResponse.json({ error: message }, { status: 400 });
  }
  if (message === "Email already in use") {
    return NextResponse.json({ error: message }, { status: 409 });
  }
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const user = await updateUser(id, body);

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    return mapErrorToResponse(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deleteUser(id);

    if (!deleted) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return mapErrorToResponse(error);
  }
}
