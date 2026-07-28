import { TEAM_NAME } from "@/lib/constants";
import { formatAmount, formatDate } from "@/lib/format";

export type WhatsAppSummaryInput = {
  opponentTeam: string;
  date: Date | string;
  groundName: string;
  matchCollection: number;
  matchExpenses: number;
  netAmount: number;
  teamBalance: number;
  pendings: { name: string; pending: number }[];
};

/**
 * Plain-text match summary for pasting into the team WhatsApp group.
 * WhatsApp renders *text* as bold, so the asterisks are intentional.
 */
export function buildWhatsAppSummary(input: WhatsAppSummaryInput): string {
  const lines: string[] = [];

  lines.push(`🏏 *Match Summary: ${TEAM_NAME} vs ${input.opponentTeam}*`);
  lines.push(`📅 Date: ${formatDate(input.date)} | 🏟 Ground: ${input.groundName}`);
  lines.push("");
  lines.push("💰 *Match Accounts:*");
  lines.push(`Total Collection: ₹${formatAmount(input.matchCollection)}`);
  lines.push(`Total Expenses: ₹${formatAmount(input.matchExpenses)}`);
  lines.push(`Net Match Balance: ₹${formatAmount(input.netAmount)}`);
  lines.push("");
  lines.push(`📊 *Current Team Balance:* ₹${formatAmount(input.teamBalance)}`);

  const owing = input.pendings.filter((p) => p.pending > 0);
  if (owing.length > 0) {
    lines.push("");
    lines.push("⚠️ *Player Pendings:*");
    for (const p of owing) {
      lines.push(`${p.name}: ₹${formatAmount(p.pending)}`);
    }
  }

  return lines.join("\n");
}
