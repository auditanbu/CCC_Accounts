/** Tiny class joiner — avoids pulling in clsx for this one job. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
