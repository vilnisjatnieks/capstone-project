import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { StaffWorksClient } from "./staff-works-client";
import { StaffCheckoutsClient } from "./staff-checkouts-client";

export default async function StaffPage() {
    const user = await getCurrentUser();

    if (!user || (user.role !== "admin" && user.role !== "staff")) {
        redirect("/");
    }

    const [worksResult, checkoutsResult, usersResult] = await Promise.all([
        query(
            `SELECT id, created_at, title, date_published, publisher, editor,
                lccn, isbn_10, isbn_13, media_type, number_of_pages, language,
                location, updated_at
         FROM works ORDER BY created_at DESC`
        ),
        query(
            `SELECT c.id, c.work_id, c.user_id, c.checked_out_at, c.due_date,
                    c.returned_at, c.created_at, c.updated_at,
                    w.title AS work_title,
                    u.name AS user_name, u.email AS user_email
             FROM checkouts c
             JOIN works w ON w.id = c.work_id
             JOIN users u ON u.id = c.user_id
             ORDER BY c.created_at DESC`
        ),
        query(`SELECT id, name, email FROM users ORDER BY name ASC`),
    ]);

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 space-y-10">
            <section>
                <h1 className="mb-6 text-2xl font-bold">Item Management</h1>
                <StaffWorksClient initialWorks={worksResult.rows} />
            </section>
            <section>
                <h2 className="mb-6 text-2xl font-bold">Checkouts</h2>
                <StaffCheckoutsClient
                    initialCheckouts={checkoutsResult.rows}
                    works={worksResult.rows}
                    users={usersResult.rows}
                />
            </section>
        </div>
    );
}
