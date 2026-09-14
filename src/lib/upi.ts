import { TEAM_UPI_ID, TEAM_UPI_NAME } from "@/lib/constants";

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
 * A person-to-person UPI deep link to the team's collection account.
 *
 * Deliberately minimal. "You've exceeded the bank limit for this payment" is
 * not what it says it is: in UPI apps it doubles as the generic fallback for a
 * payload the risk engine refused, which is why it showed up on a ₹5 test and
 * on ₹500 alike — amounts no bank caps — while the same VPA typed by hand
 * went through. Two things in the old link caused it:
 *
 *  - `pn` carried the team name while the VPA resolves to its account
 *    holder's name. Apps compare the two, and a mismatch is exactly what a
 *    spoofed payment link looks like, so it gets blocked. `pn` now carries
 *    the registered name (TEAM_UPI_NAME), so the two agree.
 *
 *  - `tr` is NPCI's merchant transaction reference, mandated for P2M and
 *    expected alongside a merchant code (`mc`) and, for verified merchants, a
 *    signature. Sending it to a personal VPA with neither reads as a
 *    malformed merchant intent. This is P2P, so it is gone.
 *
 * `cu=INR` stays: it is spec-mandatory, and leaving it out produced this same
 * error for its own reasons. `am` and `tn` are omitted by default so the payer
 * enters their own amount and note.
 *
 * There is no callback to this app, so a payment is still marked collected by
 * hand afterwards. If the picked app isn't installed, the tap does nothing.
 */
export function buildUpiAppLink(app: UpiAppId, note?: string, amount?: number): string {
  const scheme = UPI_APPS.find((a) => a.id === app)!.scheme;
  const entries: [string, string][] = [
    ["pa", TEAM_UPI_ID],
    ["pn", TEAM_UPI_NAME],
    ["cu", "INR"],
  ];
  if (amount !== undefined) entries.push(["am", amount.toFixed(2)]);
  if (note) entries.push(["tn", note]);
  return `${scheme}?${entries.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join("&")}`;
}
