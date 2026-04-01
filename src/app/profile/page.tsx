import { getCurrentUser } from "@/lib/auth";
import { getUserCheckouts } from "@/lib/data/checkouts";
import { redirect } from "next/navigation";
import { ProfileClient } from "./profile-client";
import { LogoutButton } from "@/components/logout-button";
import { Button } from "@/components/ui/button";

export default async function ProfilePage() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/login");
    }

    const checkouts = await getUserCheckouts(user.id);

    return (
        <div className="mx-auto max-w-7xl px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">My Profile</h1>
            <div className="bg-card rounded-lg border shadow-sm p-6 mb-8">
                <h2 className="text-xl font-semibold mb-2">Account Information</h2>
                <div className="space-y-1">
                    <p><span className="font-medium text-muted-foreground">Name:</span> {user.name}</p>
                    <p><span className="font-medium text-muted-foreground">Email:</span> {user.email}</p>
                    <p><span className="font-medium text-muted-foreground">Role:</span> <span className="capitalize">{user.role}</span></p>
                </div>
                <div className="flex gap-3 mt-6">
                    <Button variant="outline" asChild>
                        <a href="mailto:vjatnieks@loyola.edu">Contact Staff</a>
                    </Button>
                    <LogoutButton />
                </div>
            </div>

            <h2 className="text-2xl font-bold mb-6">My Checkouts</h2>
            <ProfileClient initialCheckouts={checkouts} />
        </div>
    );
}
