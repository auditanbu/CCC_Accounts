import { TEAM_NAME, TEAM_UPI_ID } from "@/lib/constants";

/**
 * A `upi://pay` deep link. Tapped on a phone, the OS offers the installed
 * UPI apps (GPay, PhonePe, ...) and opens whichever one is picked straight
 * to its confirm-payment screen, with the amount and note already filled
 * in — there's no callback to this app, so a payment still has to be
 * marked collected manually afterwards.
 */
export function buildUpiPayLink({ amount, note }: { amount: number; note: string }): string {
  const params = [
    ["pa", TEAM_UPI_ID],
    ["pn", TEAM_NAME],
    ["am", amount.toFixed(2)],
    ["cu", "INR"],
    ["tn", note],
  ]
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");
  return `upi://pay?${params}`;
}
