import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { AdminUsersClient } from "./admin-users-client";

export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    redirect("/");
  }

  const result = await query(
    "SELECT id, email, name, role, created_at, updated_at FROM users ORDER BY created_at DESC"
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">User Management</h1>
      <AdminUsersClient
        initialUsers={result.rows}
        currentUserId={user.id}
      />
    </div>
  );
}
