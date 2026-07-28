/** Money and date helpers. Everything renders in IST / INR. */

const IST = "Asia/Kolkata";

const inr = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

/** 1234.5 -> "₹1,234.5", -1500 -> "-₹1,500" (sign before the symbol). */
export function formatMoney(amount: number): string {
  const value = round2(amount);
  return value < 0 ? `-₹${inr.format(Math.abs(value))}` : `₹${inr.format(value)}`;
}

/**
 * Plain number, no symbol — used by the WhatsApp export, where the template
 * puts the ₹ in itself, so the sign stays attached to the digits.
 */
export function formatAmount(amount: number): string {
  return inr.format(round2(amount));
}

/** Floats accumulate noise; snap to paise before displaying or comparing. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: IST,
  }).format(new Date(date));
}

export function formatDateLong(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: IST,
  }).format(new Date(date));
}

export function formatTime(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: IST,
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)}, ${formatTime(date)}`;
}

/** Value for <input type="datetime-local">, rendered in IST. */
export function toDateTimeLocalValue(date: Date | string): string {
  const d = new Date(date);
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: IST,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** "3 days ago" / "in 2 weeks" */
export function relativeDay(date: Date | string): string {
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const diffMs = new Date(date).getTime() - Date.now();
  const days = Math.round(diffMs / 86_400_000);
  if (Math.abs(days) < 1) return "today";
  if (Math.abs(days) < 30) return rtf.format(days, "day");
  if (Math.abs(days) < 365) return rtf.format(Math.round(days / 30), "month");
  return rtf.format(Math.round(days / 365), "year");
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
