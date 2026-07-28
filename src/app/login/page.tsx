import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/app/login/LoginForm";
import { isAuthConfigured } from "@/lib/auth";
import { isAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Admin sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  if (await isAdmin()) redirect(next && next.startsWith("/") ? next : "/");

  return (
    <div className="mx-auto max-w-sm pt-6">
      <div className="mb-6 text-center">
        <div
          className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-ios-yellow to-ios-orange text-2xl shadow-card"
          aria-hidden
        >
          🏏
        </div>
        <h1 className="page-title">Admin sign in</h1>
        <p className="mt-1.5 text-[14px] text-label-secondary">
          Enter the team PIN to manage matches and accounts.
        </p>
      </div>

      {isAuthConfigured() ? (
        <LoginForm next={next} />
      ) : (
        <div className="card-pad text-[13px] leading-relaxed text-label-secondary">
          <p className="mb-2 font-semibold text-ios-red">Admin access isn&apos;t configured.</p>
          <p>
            Set <code className="rounded bg-black/[0.05] px-1 py-0.5">ADMIN_PIN</code> and{" "}
            <code className="rounded bg-black/[0.05] px-1 py-0.5">AUTH_SECRET</code> in the
            environment, then restart the app.
          </p>
        </div>
      )}

      <p className="mt-6 text-center text-[13px] text-label-secondary">
        Teammates don&apos;t need a PIN — everything on the dashboard is view-only for them.
      </p>
    </div>
  );
}
