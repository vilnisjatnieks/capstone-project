import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { CircleUser } from "lucide-react";

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
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground" asChild>
                <Link href="/profile"><CircleUser className="h-5 w-5" /></Link>
              </Button>
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
