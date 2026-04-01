import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
    getRecommendations,
    ANONYMOUS_USER_ID,
} from "@/lib/data/recommendations";

export async function GET() {
    try {
        const user = await getCurrentUser();
        const userId = user?.id ?? ANONYMOUS_USER_ID;

        const { results, source } = await getRecommendations(userId);
        return NextResponse.json({ results, source });
    } catch {
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
