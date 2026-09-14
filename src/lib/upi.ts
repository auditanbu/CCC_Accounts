import { TEAM_UPI_ID, TEAM_UPI_NAME } from "@/lib/constants";

/**
 * A person-to-person UPI deep link to the team's collection account.
 *
 * Uses NPCI's standard `upi://pay` scheme, which every UPI app registers a
 * handler for, so the OS offers whichever ones are installed.
 *
 * It deliberately does NOT use an app's own scheme. Google Pay's `tez://`
 * is the entry point for its merchant SDK and expects a merchant code, a
 * transaction id and an RSA `sign` from a merchant onboarded with Google.
 * A personal VPA arriving there with none of that is refused, and Google Pay
 * reports the refusal as "You've exceeded the bank limit for this payment" —
 * its generic fallback, which is why the error was identical on Rs 1 and on
 * Rs 500 while the same VPA typed by hand went through every time. Typing by
 * hand uses the app's own P2P flow, which runs no merchant validation, and
 * `upi://pay` is the sanctioned route to that same flow.
 *
 * `pn` must match the name registered against the VPA: apps resolve the VPA
 * and compare, and a link naming one payee while the VPA belongs to another
 * is what a spoofed payment link looks like. `cu=INR` is spec-mandatory.
 * `am` and `tn` are omitted so the payer fills in their own amount and note.
 *
 * There is no callback to this app, so a payment is still marked collected by
 * hand afterwards.
 */
export function buildUpiLink(note?: string, amount?: number): string {
  const entries: [string, string][] = [
    ["pa", TEAM_UPI_ID],
    ["pn", TEAM_UPI_NAME],
    ["cu", "INR"],
  ];
  if (amount !== undefined) entries.push(["am", amount.toFixed(2)]);
  if (note) entries.push(["tn", note]);
  return `upi://pay?${entries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")}`;
}
