import "server-only";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Players have no login, so a phone is told apart by a random id in this
 * cookie. It caps how many field sets one phone can save and lets that phone
 * change its own. It is never sent back to the page.
 */
const DEVICE_COOKIE = "esk_device";
const DEVICE_MAX_AGE_SECONDS = 60 * 60 * 24 * 730; // 2 years

export async function getDeviceId(): Promise<string | null> {
  const store = await cookies();
  return store.get(DEVICE_COOKIE)?.value ?? null;
}

/** Reads the phone's id, issuing one first if it has none. Server actions only —
 * a page render can't set cookies. */
export async function ensureDeviceId(): Promise<string> {
  const existing = await getDeviceId();
  if (existing) return existing;
  const id = randomUUID();
  const store = await cookies();
  store.set(DEVICE_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DEVICE_MAX_AGE_SECONDS,
  });
  return id;
}
