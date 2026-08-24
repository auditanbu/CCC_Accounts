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

/** A short unique reference per link — NPCI's `tr` field. Not strictly
 * mandatory, but its absence is one more way an intent-triggered payment
 * reads as less "complete" than a manually-typed transfer to the same
 * backend checks. */
function transactionRef(): string {
  return `ESK${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
}

/**
 * An app-specific UPI deep link — Google Pay's `tez://` or PhonePe's own
 * scheme opens that exact app's confirm-payment screen directly, no OS
 * app-chooser in between. BHIM uses the standard upi:// scheme instead (see
 * above), so picking it may still show a chooser if more than one app
 * answers to upi://. Either way there's no callback to this app, so a
 * payment has to be marked collected manually afterwards. If the picked
 * app isn't installed, the tap silently does nothing.
 *
 * `cu=INR` is mandatory per NPCI's UPI linking spec — leaving it out let the
 * app render the confirm screen fine, but the actual payment got rejected
 * by the backend with a misleading "exceeded bank limit" error (seen on a
 * ₹5 test, which no bank would genuinely cap). `am` is spec'd too and, when
 * known, saves the payer from having to type the exact amount themselves.
 *
 * Even with those fixed, the same VPA can still fail this way through an
 * intent link while a manually-typed transfer to it succeeds — UPI apps and
 * banks commonly apply stricter checks to externally-triggered ("intent")
 * payments than to ones typed inside their own UI, especially to a personal
 * (non-merchant) VPA. `tr` narrows that gap but can't fully close it; if it
 * still fails, that's a bank/NPCI-side restriction on intent payments to
 * this account, not something a link's parameters can override.
 */
export function buildUpiAppLink(app: UpiAppId, note: string, amount?: number): string {
  const scheme = UPI_APPS.find((a) => a.id === app)!.scheme;
  const entries: [string, string][] = [
    ["pa", TEAM_UPI_ID],
    ["pn", TEAM_NAME],
    ["cu", "INR"],
    ["tr", transactionRef()],
  ];
  if (amount !== undefined) entries.push(["am", amount.toFixed(2)]);
  entries.push(["tn", note]);
  return `${scheme}?${entries.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join("&")}`;
}
