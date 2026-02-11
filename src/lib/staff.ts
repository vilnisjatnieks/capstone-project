import { NextResponse } from "next/server";
import { getCurrentUser, User } from "@/lib/auth";

type StaffCheckResult =
    | { authorized: true; user: User }
    | { authorized: false; response: NextResponse };

export async function requireStaff(): Promise<StaffCheckResult> {
    const user = await getCurrentUser();

    if (!user) {
        return {
            authorized: false,
            response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        };
    }

    if (user.role !== "admin" && user.role !== "staff") {
        return {
            authorized: false,
            response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
        };
    }

    return { authorized: true, user };
}
