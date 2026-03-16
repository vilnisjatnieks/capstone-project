import { requestCheckoutExtension } from "@/lib/data/checkouts";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const checkout = await requestCheckoutExtension(id, user.id);

        if (!checkout) {
            return NextResponse.json(
                { error: "Not found or ineligible for an extension" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, checkout });
    } catch (error) {
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
