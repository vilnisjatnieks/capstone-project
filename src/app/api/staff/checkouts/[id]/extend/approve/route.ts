import { approveCheckoutExtension } from "@/lib/data/checkouts";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user || (user.role !== "admin" && user.role !== "staff")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const checkout = await approveCheckoutExtension(id);

        if (!checkout) {
            return NextResponse.json(
                { error: "Not found or not pending extension" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, checkout });
    } catch (error) {
        if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
