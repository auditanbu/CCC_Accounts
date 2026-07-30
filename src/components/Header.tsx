import Link from "next/link";

import { DesktopNav } from "@/components/Nav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LockIcon, LogoutIcon } from "@/components/ui/Icons";
import { TEAM_NAME } from "@/lib/constants";
import { isAdmin } from "@/lib/session";
import { logoutAction } from "@/app/actions/auth";

export async function Header() {
  const admin = await isAdmin();

  return (
    <header className="glass sticky top-0 z-30 border-b border-black/[0.06]">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- a static 32px
              logo doesn't need Next's image pipeline (and its sharp dependency
              isn't guaranteed on a self-hosted, non-Vercel build). */}
          <img
            src="/icon.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 rounded-[10px] shadow-sm"
          />
          <span className="truncate text-[15px] font-semibold tracking-[-0.01em]">
            {TEAM_NAME}
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <DesktopNav />
          <ThemeToggle />
          {admin ? (
            <form action={logoutAction}>
              <button type="submit" className="btn btn-secondary btn-sm px-2" aria-label="Sign out" title="Sign out">
                <LogoutIcon width={16} height={16} strokeWidth={2} />
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="btn btn-tinted btn-sm"
              aria-label="Admin sign in"
            >
              <LockIcon width={14} height={14} strokeWidth={2} />
              Admin
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
