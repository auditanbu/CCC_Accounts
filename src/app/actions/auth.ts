"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  checkPin,
  clearLoginAttempts,
  isAuthConfigured,
  loginCooldown,
  recordFailedLogin,
} from "@/lib/auth";
import { endAdminSession, startAdminSession } from "@/lib/session";
import { type ActionState, runAction } from "@/app/actions/types";

async function clientKey(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const state = await runAction(async () => {
    if (!isAuthConfigured()) {
      return {
        ok: false,
        error: "Admin access isn't configured. Set ADMIN_PIN and AUTH_SECRET in the environment.",
      };
    }

    const key = await clientKey();
    const cooldown = loginCooldown(key);
    if (cooldown > 0) {
      const mins = Math.ceil(cooldown / 60);
      return { ok: false, error: `Too many attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.` };
    }

    const pin = String(formData.get("pin") ?? "");
    if (!pin) return { ok: false, fieldErrors: { pin: "Enter your PIN." } };

    if (!checkPin(pin)) {
      recordFailedLogin(key);
      return { ok: false, error: "Incorrect PIN." };
    }

    clearLoginAttempts(key);
    await startAdminSession();
    return { ok: true };
  });

  if (state.ok) {
    const next = String(formData.get("next") ?? "/");
    // Only allow same-origin paths back through the redirect.
    redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
  }
  return state;
}

export async function logoutAction(): Promise<void> {
  await endAdminSession();
  redirect("/");
}
