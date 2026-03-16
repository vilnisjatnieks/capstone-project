import { NextRequest, NextResponse } from "next/server";
import { getAdminAllUsers, createUser } from "@/lib/data/users";

function mapErrorToResponse(error: unknown): NextResponse {
  const message =
    error instanceof Error ? error.message : "Internal server error";
  if (message === "Unauthorized") {
    return NextResponse.json({ error: message }, { status: 401 });
  }
  if (message === "Forbidden") {
    return NextResponse.json({ error: message }, { status: 403 });
  }
  if (message === "Email, name, and password are required") {
    return NextResponse.json({ error: message }, { status: 400 });
  }
  if (message === "Email already in use") {
    return NextResponse.json({ error: message }, { status: 409 });
  }
  return NextResponse.json({ error: message }, { status: 500 });
}
  
export async function GET() {
  try {
    const users = await getAdminAllUsers();
    return NextResponse.json(users);
  } catch (error) {
    return mapErrorToResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, password, role } = body;

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: "Email, name, and password are required" },
        { status: 400 }
      );
    }

    const user = await createUser({ email, name, password, role });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return mapErrorToResponse(error);
  }
}
