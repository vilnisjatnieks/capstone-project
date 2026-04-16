import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAdminAllUsers } from "@/lib/data/users";
import { AdminUsersClient } from "./admin-users-client";

export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    redirect("/");
  }

  const { rows, total } = await getAdminAllUsers({ page: 1, pageSize: 20, offset: 0 });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">User Management</h1>
      <AdminUsersClient
        initialUsers={rows}
        initialTotal={total}
        currentUserId={user.id}
      />
    </div>
  );
}
