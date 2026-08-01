/**
 * Money and date helpers. Everything renders in IST / INR.
 *
 * Deliberately free of `Intl`. Minimal Node builds — including the Alpine
 * images this app is deployed from — ship reduced ICU data, where
 * `Intl.DateTimeFormat` with `timeZone: 'Asia/Kolkata'` throws RangeError and
 * the `en-IN` locale silently degrades to US digit grouping. Both are
 * unacceptable in a ledger, and neither shows up until it is running in the
 * container.
 *
 * India has been UTC+5:30 with no daylight saving since 1945, and Indian digit
 * grouping is a fixed rule, so both are computed directly here.
 */

/** Fixed offset for Asia/Kolkata. No DST, so a constant is exact. */
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

// "Sept", not "Sep" — matches how en-IN abbreviates September, which is what
// this app rendered before the ICU dependency was removed.
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sept", "Oct", "Nov", "Dec",
];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type ISTParts = {
  year: number;
  /** 1-12 */
  month: number;
  day: number;
  hour24: number;
  minute: number;
  /** 0 = Sunday */
  weekday: number;
  monthShort: string;
  monthLong: string;
  weekdayShort: string;
};

/**
 * Wall-clock components of an instant, in IST.
 *
 * Shifts the instant by the offset and then reads UTC components, which is
 * exactly what a timezone conversion does for a zone without DST.
 */
export function istParts(date: Date | string | number): ISTParts {
  const shifted = new Date(new Date(date).getTime() + IST_OFFSET_MS);
  const month = shifted.getUTCMonth();
  return {
    year: shifted.getUTCFullYear(),
    month: month + 1,
    day: shifted.getUTCDate(),
    hour24: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay(),
    monthShort: MONTHS_SHORT[month]!,
    monthLong: MONTHS_LONG[month]!,
    weekdayShort: WEEKDAYS_SHORT[shifted.getUTCDay()]!,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/* ------------------------------------------------------------------ */
/* Money                                                               */
/* ------------------------------------------------------------------ */

/** Floats accumulate noise; snap to paise before displaying or comparing. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Indian digit grouping: the last three digits, then pairs.
 * 1234567 -> "12,34,567"
 */
function groupIndian(intPart: string): string {
  if (intPart.length <= 3) return intPart;
  const last3 = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last3}`;
}

/** Plain number, no symbol — used by the WhatsApp export. -1500 -> "-1,500" */
export function formatAmount(amount: number): string {
  const value = round2(amount);
  const negative = value < 0;
  const abs = Math.abs(value);
  const whole = Math.trunc(abs);
  // Up to 2 decimals, trailing zeros trimmed, matching the previous output.
  const frac = round2(abs - whole);
  const fracStr = frac === 0 ? "" : String(frac).slice(1).replace(/0+$/, "");
  return `${negative ? "-" : ""}${groupIndian(String(whole))}${fracStr}`;
}

/** 1234.5 -> "₹1,234.5", -1500 -> "-₹1,500" (sign before the symbol). */
export function formatMoney(amount: number): string {
  const value = round2(amount);
  return value < 0
    ? `-₹${formatAmount(Math.abs(value))}`
    : `₹${formatAmount(value)}`;
}

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

/** "16 Jun 2026" */
export function formatDate(date: Date | string): string {
  const p = istParts(date);
  return `${pad(p.day)} ${p.monthShort} ${p.year}`;
}

/** "Tue, 16 June 2026" */
export function formatDateLong(date: Date | string): string {
  const p = istParts(date);
  return `${p.weekdayShort}, ${pad(p.day)} ${p.monthLong} ${p.year}`;
}

/** "7:30 am" */
export function formatTime(date: Date | string): string {
  const p = istParts(date);
  const suffix = p.hour24 < 12 ? "am" : "pm";
  const hour12 = p.hour24 % 12 === 0 ? 12 : p.hour24 % 12;
  return `${hour12}:${pad(p.minute)} ${suffix}`;
}

export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)}, ${formatTime(date)}`;
}

/** "June 2026" — the heading used to group the schedule. */
export function formatMonthYear(date: Date | string): string {
  const p = istParts(date);
  return `${p.monthLong} ${p.year}`;
}

/** "01/08/2026" — day/month/year, for a short inline payment date. */
export function formatDateSlash(date: Date | string): string {
  const p = istParts(date);
  return `${pad(p.day)}/${pad(p.month)}/${p.year}`;
}

/** Value for <input type="date">, in IST. "2026-06-16" */
export function toDateInputValue(date: Date | string): string {
  const p = istParts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Value for <input type="time">, in IST. "08:00" */
export function toTimeInputValue(date: Date | string): string {
  const p = istParts(date);
  return `${pad(p.hour24)}:${pad(p.minute)}`;
}

const DAY_MS = 86_400_000;

/** True when a "YYYY-MM-DD" date value falls on a Sunday. */
export function isSundayValue(value: string): boolean {
  return istParts(`${value}T00:00:00+05:30`).weekday === 0;
}

/**
 * `past` completed Sundays before today, then today's Sunday if today is one,
 * then `future` Sundays ahead — chronological, oldest first, as "YYYY-MM-DD"
 * values in IST. Covers logging a fixture already played as readily as one
 * still to come.
 *
 * The arithmetic runs on UTC components of an IST calendar day, so it never
 * crosses a day boundary the way local-time arithmetic on the server would.
 */
export function surroundingSundays(
  past: number,
  future: number,
  from: Date | string = new Date(),
): string[] {
  const p = istParts(from);
  // Today if today is a Sunday, else the next one ahead.
  const nextMs = Date.UTC(p.year, p.month - 1, p.day) + ((7 - p.weekday) % 7) * DAY_MS;
  const firstMs = nextMs - past * 7 * DAY_MS;
  return Array.from({ length: past + future + 1 }, (_, i) => {
    const d = new Date(firstMs + i * 7 * DAY_MS);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  });
}

/** "Sun, 16 June 2026" from a "YYYY-MM-DD" form value. */
export function formatDateValueLong(value: string): string {
  return formatDateLong(`${value}T00:00:00+05:30`);
}

/** "3 days ago" / "in 2 weeks" */
export function relativeDay(date: Date | string): string {
  const diffMs = new Date(date).getTime() - Date.now();
  const days = Math.round(diffMs / 86_400_000);
  const ago = days < 0;
  const n = Math.abs(days);
  if (n < 1) return "today";
  const say = (value: number, unit: string) => {
    const plural = value === 1 ? unit : `${unit}s`;
    return ago ? `${value} ${plural} ago` : `in ${value} ${plural}`;
  };
  if (n === 1) return ago ? "yesterday" : "tomorrow";
  if (n < 30) return say(n, "day");
  if (n < 365) return say(Math.round(n / 30), "month");
  return say(Math.round(n / 365), "year");
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/** What to show in a player's avatar circle: their jersey number, or their
 * initials when they don't have one on file. */
export function avatarLabel(name: string, jerseyNumber: number | null): string {
  return jerseyNumber !== null ? String(jerseyNumber) : initials(name);
}
