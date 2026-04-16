import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAllWorks, getAllWorksForExport } from "@/lib/data/works";
import { getAllCheckouts } from "@/lib/data/checkouts";
import { getAllUsers } from "@/lib/data/users";
import { getAllTags } from "@/lib/data/tags";
import { StaffWorksClient } from "./staff-works-client";
import { StaffCheckoutsClient } from "./staff-checkouts-client";
import { StaffTagsClient } from "./staff-tags-client";

const FIRST_PAGE = { page: 1, pageSize: 20, offset: 0 };

export default async function StaffPage() {
    const user = await getCurrentUser();

    if (!user || (user.role !== "admin" && user.role !== "staff")) {
        redirect("/");
    }

    const [worksPage, checkoutsPage, allWorks, users, tags] = await Promise.all([
        getAllWorks(FIRST_PAGE),
        getAllCheckouts(FIRST_PAGE),
        getAllWorksForExport(),
        getAllUsers(),
        getAllTags(),
    ]);

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 space-y-10">
            <section>
                <h1 className="mb-6 text-2xl font-bold">Item Management</h1>
                <StaffWorksClient
                    initialWorks={worksPage.rows}
                    initialTotal={worksPage.total}
                />
            </section>
            <section>
                <h2 className="mb-6 text-2xl font-bold">Checkouts</h2>
                <StaffCheckoutsClient
                    initialCheckouts={checkoutsPage.rows}
                    initialTotal={checkoutsPage.total}
                    works={allWorks}
                    users={users}
                />
            </section>
            <section>
                <h2 className="mb-6 text-2xl font-bold">Tags</h2>
                <StaffTagsClient initialTags={tags} />
            </section>
        </div>
    );
}
