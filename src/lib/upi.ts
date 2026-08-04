import { TEAM_NAME, TEAM_UPI_ID } from "@/lib/constants";

export type UpiAppId = "gpay" | "phonepe" | "bhim";

export const UPI_APPS: { id: UpiAppId; name: string; scheme: string }[] = [
  { id: "gpay", name: "Google Pay", scheme: "tez://upi/pay" },
  { id: "phonepe", name: "PhonePe", scheme: "phonepe://pay" },
  // BHIM has no custom scheme of its own — as NPCI's reference app, it
  // answers to the standard upi:// scheme like most other UPI apps. A made-up
  // "bhim://pay" isn't registered by anything, which is what threw "This
  // request type is not supported".
  { id: "bhim", name: "BHIM", scheme: "upi://pay" },
];

/**
 * An app-specific UPI deep link — Google Pay's `tez://` or PhonePe's own
 * scheme opens that exact app's confirm-payment screen directly, no OS
 * app-chooser in between. BHIM uses the standard upi:// scheme instead (see
 * above), so picking it may still show a chooser if more than one app
 * answers to upi://. Either way there's no callback to this app, so a
 * payment has to be marked collected manually afterwards. If the picked
 * app isn't installed, the tap silently does nothing.
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
