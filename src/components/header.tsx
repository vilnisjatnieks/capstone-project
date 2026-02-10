import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { Button } from "@/components/ui/button";

export async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold">
          Home
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              {user.role === "admin" && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin">Admin</Link>
                </Button>
              )}
              <span className="text-sm text-muted-foreground">
                {user.name}
              </span>
              <LogoutButton />
            </>
          ) : (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
