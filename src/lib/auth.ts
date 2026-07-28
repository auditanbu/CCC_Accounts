/**
 * Lightweight single-admin auth.
 *
 * There is exactly one privileged user (the team captain). Rather than run a
 * user table + password hashing for one account, we check a PIN from the
 * environment and hand back a signed, expiring cookie.
 *
 * Everything here uses Web Crypto only, so the same code runs in the Edge
 * middleware and in Node server actions.
 */

export const SESSION_COOKIE = "esk_admin";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

const encoder = new TextEncoder();

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "AUTH_SECRET is missing or too short (needs >= 16 chars). Set it in the environment.",
    );
  }
  return s;
}

/**
 * Strips surrounding quotes left by pasting a `KEY="value"` line into a
 * dashboard's raw editor, which stores the quotes as part of the value.
 */
function clean(raw: string): string {
  const trimmed = raw.trim();
  const quoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));
  return quoted && trimmed.length >= 2 ? trimmed.slice(1, -1).trim() : trimmed;
}

function adminPin(): string | null {
  const pin = process.env.ADMIN_PIN;
  if (!pin) return null;
  const cleaned = clean(pin);
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Shape of the configured PIN, for diagnostics. Never returns the value —
 * only enough to tell "the variable holds what I think it holds" from
 * "the variable holds something else".
 */
export function describeAdminPin(): Record<string, unknown> {
  const raw = process.env.ADMIN_PIN;
  if (raw === undefined) return { configured: false, reason: "ADMIN_PIN is not set" };
  const cleaned = clean(raw);
  return {
    configured: cleaned.length > 0,
    rawLength: raw.length,
    effectiveLength: cleaned.length,
    hadSurroundingWhitespace: raw !== raw.trim(),
    hadWrappingQuotes: raw.trim() !== cleaned && raw.trim().length - cleaned.length >= 2,
    allDigits: /^\d+$/.test(cleaned),
    // First and last character only — enough to spot a placeholder like
    // "change-me-1234" without disclosing the PIN itself.
    firstChar: cleaned.slice(0, 1),
    lastChar: cleaned.slice(-1),
  };
}

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toBase64Url(new Uint8Array(sig));
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Length-independent constant-time-ish comparison. */
function safeEqual(a: string, b: string): boolean {
  const ab = encoder.encode(a);
  const bb = encoder.encode(b);
  let diff = ab.length ^ bb.length;
  const len = Math.max(ab.length, bb.length);
  for (let i = 0; i < len; i++) {
    diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

/** Token shape: `<issuedAt>.<expiresAt>.<signature>` */
export async function createSessionToken(): Promise<string> {
  const issued = Date.now();
  const expires = issued + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `${issued}.${expires}`;
  return `${payload}.${await hmac(payload)}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [issued, expires, sig] = parts as [string, string, string];
  if (!/^\d+$/.test(issued) || !/^\d+$/.test(expires)) return false;
  if (Number(expires) < Date.now()) return false;
  try {
    return safeEqual(sig, await hmac(`${issued}.${expires}`));
  } catch {
    return false;
  }
}

export function checkPin(candidate: string): boolean {
  const pin = adminPin();
  if (!pin) return false;
  // Both sides are cleaned the same way, so stray whitespace on either the
  // typed value or the stored one cannot cause a spurious rejection.
  return safeEqual(clean(candidate), pin);
}

export function isAuthConfigured(): boolean {
  return Boolean(adminPin() && process.env.AUTH_SECRET);
}

/* ------------------------------------------------------------------ */
/* Login throttling                                                    */
/* ------------------------------------------------------------------ */

const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;

/** Returns seconds to wait, or 0 when the caller may try a PIN. */
export function loginCooldown(key: string): number {
  const rec = attempts.get(key);
  if (!rec) return 0;
  if (Date.now() > rec.resetAt) {
    attempts.delete(key);
    return 0;
  }
  if (rec.count < MAX_ATTEMPTS) return 0;
  return Math.ceil((rec.resetAt - Date.now()) / 1000);
}

export function recordFailedLogin(key: string): void {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now > rec.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  rec.count += 1;
}

export function clearLoginAttempts(key: string): void {
  attempts.delete(key);
}
