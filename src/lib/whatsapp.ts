import { TEAM_NAME } from "@/lib/constants";
import { formatAmount, formatDate } from "@/lib/format";

export type WhatsAppSummaryInput = {
  opponentTeam: string;
  date: Date | string;
  groundName: string;
  matchCollection: number;
  matchExpenses: number;
  /** Individual expense lines, itemised under the expenses total. */
  expenseItems?: { category: string; note?: string | null; amount: number }[];
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
  // Itemised breakdown sits directly under the total so the group can see
  // what the money went on without opening the app.
  for (const e of input.expenseItems ?? []) {
    const note = e.note?.trim();
    const label = note ? `${e.category} (${note})` : e.category;
    lines.push(`  • ${label}: ₹${formatAmount(e.amount)}`);
  }
  lines.push(`Net Match Balance: ₹${formatAmount(input.netAmount)}`);
  lines.push("");
  lines.push(`📊 *Current Team Balance:* ₹${formatAmount(input.teamBalance)}`);

  // Biggest dues first — the names worth chasing sit at the top of the list.
  const owing = input.pendings
    .filter((p) => p.pending > 0)
    .sort((a, b) => b.pending - a.pending);
  if (owing.length > 0) {
    lines.push("");
    lines.push("⚠️ *Player Pendings:*");
    for (const p of owing) {
      lines.push(`${p.name}: ₹${formatAmount(p.pending)}`);
    }
  }

  // Negative pending means paid in more than they owe — carried as credit
  // against future matches, not money to chase. Ascending order therefore
  // puts the largest credit first.
  const excess = input.pendings
    .filter((p) => p.pending < 0)
    .sort((a, b) => a.pending - b.pending);
  if (excess.length > 0) {
    lines.push("");
    lines.push("✅ *Excess Paid:*");
    for (const p of excess) {
      lines.push(`${p.name}: ₹${formatAmount(-p.pending)}`);
    }
  }

  return lines.join("\n");
}
