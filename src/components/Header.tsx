import Link from "next/link";

import { DesktopNav } from "@/components/Nav";
import { LockIcon } from "@/components/ui/Icons";
import { TEAM_NAME } from "@/lib/constants";
import { isAdmin } from "@/lib/session";
import { logoutAction } from "@/app/actions/auth";

export async function Header() {
  const admin = await isAdmin();

  return (
    <header className="glass sticky top-0 z-30 border-b border-black/[0.06]">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-gradient-to-br from-ios-yellow to-ios-orange text-[15px] shadow-sm"
            aria-hidden
          >
            🏏
          </span>
          <span className="truncate text-[15px] font-semibold tracking-[-0.01em]">
            {TEAM_NAME}
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <DesktopNav />
          {admin ? (
            <form action={logoutAction}>
              <button type="submit" className="btn btn-secondary btn-sm">
                Sign out
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
