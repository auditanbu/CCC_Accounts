import { TEAM_UPI_ID, TEAM_UPI_NAME } from "@/lib/constants";

export type UpiAppId = "gpay" | "phonepe";

/**
 * Each app's own scheme, so the tap lands in that app and nothing else.
 *
 * The standard `upi://pay` is not used here on purpose: it is whatever the OS
 * decides claims the scheme, and on iOS that is WhatsApp Pay, with no way to
 * filter the chooser. Paying through a named app means using its own scheme.
 */
export const UPI_APPS: { id: UpiAppId; name: string; scheme: string }[] = [
  { id: "gpay", name: "Google Pay", scheme: "tez://upi/pay" },
  { id: "phonepe", name: "PhonePe", scheme: "phonepe://pay" },
];

/**
 * A person-to-person UPI deep link to the team's collection account.
 *
 * `pn` must match the name registered against the VPA: apps resolve the VPA
 * and compare the two, and a link naming one payee while the VPA belongs to
 * another is what a spoofed payment link looks like. `cu=INR` is
 * spec-mandatory, and its absence caused a failure of its own. `am` and `tn`
 * are omitted so the payer fills in their own amount and note.
 *
 * No merchant fields are sent — no `mc`, `tid`, `tr` or `sign`. These are P2P
 * transfers to a personal VPA, and sending a merchant transaction reference
 * without the rest reads as a malformed merchant intent.
 *
 * Known issue: Google Pay has been refusing these and reporting it as "You've
 * exceeded the bank limit for this payment" — identically on Rs 1 and Rs 500,
 * so the amount is not the variable, while the same VPA typed by hand goes
 * through every time. That points at a restriction on intent-initiated
 * payments to this personal VPA rather than anything in the link, which a
 * merchant VPA would be the real answer to. PhonePe has not shown the problem.
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
  return `${scheme}?${entries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")}`;
}
