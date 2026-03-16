import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAllWorks } from "@/lib/data/works";
import { getAllCheckouts } from "@/lib/data/checkouts";
import { getAllUsers } from "@/lib/data/users";
import { getAllTags } from "@/lib/data/tags";
import { StaffWorksClient } from "./staff-works-client";
import { StaffCheckoutsClient } from "./staff-checkouts-client";
import { StaffTagsClient } from "./staff-tags-client";

export default async function StaffPage() {
    const user = await getCurrentUser();

    if (!user || (user.role !== "admin" && user.role !== "staff")) {
        redirect("/");
    }

    const [works, checkouts, users, tags] = await Promise.all([
        getAllWorks(),
        getAllCheckouts(),
        getAllUsers(),
        getAllTags(),
    ]);

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 space-y-10">
            <section>
                <h1 className="mb-6 text-2xl font-bold">Item Management</h1>
                <StaffWorksClient initialWorks={works} />
            </section>
            <section>
                <h2 className="mb-6 text-2xl font-bold">Checkouts</h2>
                <StaffCheckoutsClient
                    initialCheckouts={checkouts}
                    works={works}
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
