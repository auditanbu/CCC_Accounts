/**
 * Loads the squad with the balances carried over from the Excel ledger.
 *
 * `openingBalance` is positive when the player owes and negative when they are
 * in credit, matching how the app reports pending amounts. The Excel sheet uses
 * the opposite sign, so the figures are flipped here rather than in the app.
 *
 * Safe to re-run: players are matched on name and updated in place, so this
 * corrects balances rather than duplicating anyone.
 *
 *   npx tsx prisma/seed-opening.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Row = { name: string; jersey: number; opening: number; fee?: number };

/** Owed to the team, from the pending list. */
const OWES: Row[] = [
  { name: "Karthik", jersey: 21, opening: 1800 },
  { name: "Rajkumar", jersey: 22, opening: 1500 },
  { name: "Prakash", jersey: 9, opening: 1000 },
  { name: "Raj", jersey: 23, opening: 400 },
  { name: "Mythish", jersey: 24, opening: 300 },
  { name: "Santhosh", jersey: 25, opening: 200 },
  { name: "Jeeva", jersey: 26, opening: 200 },
];

/** Paid in excess — carried as credit, so negative. */
const CREDIT: Row[] = [
  { name: "Mohan", jersey: 27, opening: -670 },
  { name: "Srirangan", jersey: 333, opening: -280 },
  { name: "Anbu", jersey: 3, opening: -200 },
  { name: "Madhesh", jersey: 10, opening: -200 },
  { name: "Mani", jersey: 99, opening: -150 },
];

const SQUAD = [...OWES, ...CREDIT];

async function main() {
  console.log("Setting opening balances…\n");

  for (const row of SQUAD) {
    const existing = await prisma.player.findFirst({ where: { name: row.name } });
    if (existing) {
      await prisma.player.update({
        where: { id: existing.id },
        data: { openingBalance: row.opening },
      });
      console.log(`  updated  ${row.name.padEnd(12)} ${row.opening >= 0 ? " " : ""}${row.opening}`);
    } else {
      await prisma.player.create({
        data: {
          name: row.name,
          jerseyNumber: row.jersey,
          defaultMatchFee: row.fee ?? 300,
          openingBalance: row.opening,
          status: "ACTIVE",
        },
      });
      console.log(`  created  ${row.name.padEnd(12)} ${row.opening >= 0 ? " " : ""}${row.opening}`);
    }
  }

  const agg = await prisma.player.aggregate({ _sum: { openingBalance: true } });
  const owed = SQUAD.filter((r) => r.opening > 0).reduce((s, r) => s + r.opening, 0);
  const credit = SQUAD.filter((r) => r.opening < 0).reduce((s, r) => s + r.opening, 0);
  console.log(
    `\n  owed ₹${owed} − credit ₹${Math.abs(credit)} = net pending ₹${agg._sum.openingBalance}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
