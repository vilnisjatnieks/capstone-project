import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { StaffWorksClient } from "./staff-works-client";

export default async function StaffPage() {
    const user = await getCurrentUser();

    if (!user || (user.role !== "admin" && user.role !== "staff")) {
        redirect("/");
    }

    const result = await query(
        `SELECT id, created_at, title, date_published, publisher, editor,
            lccn, isbn_10, isbn_13, media_type, number_of_pages, language,
            location, updated_at
     FROM works ORDER BY created_at DESC`
    );

    return (
        <div className="mx-auto max-w-7xl px-4 py-8">
            <h1 className="mb-6 text-2xl font-bold">Item Management</h1>
            <StaffWorksClient initialWorks={result.rows} />
        </div>
    );
}
