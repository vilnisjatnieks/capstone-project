import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { Button } from "@/components/ui/button";

export async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="bg-primary text-primary-foreground">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-lg font-semibold text-primary-foreground">
            Home
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              {user.role === "admin" && (
                <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground" asChild>
                  <Link href="/admin">Admin</Link>
                </Button>
              )}
              {(user.role === "admin" || user.role === "staff") && (
                <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground" asChild>
                  <Link href="/staff">Staff</Link>
                </Button>
              )}
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground" asChild>
                <Link href="/profile">My Profile</Link>
              </Button>
              <span className="text-sm text-primary-foreground/70 ml-2">
                {user.name}
              </span>
              <LogoutButton />
            </>
          ) : (
            <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
