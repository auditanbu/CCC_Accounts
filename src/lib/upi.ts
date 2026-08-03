import { TEAM_NAME, TEAM_UPI_ID } from "@/lib/constants";

export type UpiAppId = "gpay" | "phonepe" | "bhim";

export const UPI_APPS: { id: UpiAppId; name: string; scheme: string }[] = [
  { id: "gpay", name: "Google Pay", scheme: "tez://upi/pay" },
  { id: "phonepe", name: "PhonePe", scheme: "phonepe://pay" },
  { id: "bhim", name: "BHIM", scheme: "bhim://pay" },
];

/**
 * An app-specific UPI deep link (Google Pay's `tez://`, PhonePe's, or
 * BHIM's own scheme) rather than the generic `upi://pay` — tapping it opens
 * that exact app's confirm-payment screen directly, with no OS app-chooser
 * in between. There's still no callback to this app, so a payment has to be
 * marked collected manually afterwards. If the picked app isn't installed,
 * the tap silently does nothing — these schemes only that one app answers to.
 */
export function buildUpiAppLink(app: UpiAppId, note: string): string {
  const scheme = UPI_APPS.find((a) => a.id === app)!.scheme;
  const params = [
    ["pa", TEAM_UPI_ID],
    ["pn", TEAM_NAME],
    ["tn", note],
  ]
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");
  return `${scheme}?${params}`;
}
