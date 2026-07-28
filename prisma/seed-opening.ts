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

type Row = { name: string; opening: number };

/** Owed to the team, from the pending list. */
const OWES: Row[] = [
  { name: "Karthik", opening: 1800 },
  { name: "Rajkumar", opening: 1500 },
  { name: "Prakash", opening: 1000 },
  { name: "Raj", opening: 400 },
  { name: "Mythish", opening: 300 },
  { name: "Santhosh", opening: 200 },
  { name: "Jeeva", opening: 200 },
];

/** Paid in excess — carried as credit, so negative. */
const CREDIT: Row[] = [
  { name: "Mohan", opening: -670 },
  { name: "Srirangan", opening: -280 },
  { name: "Anbu", opening: -200 },
  { name: "Madhesh", opening: -200 },
  { name: "Mani", opening: -150 },
];

const SQUAD = [...OWES, ...CREDIT];

async function main() {
  console.log("Setting opening balances…\n");
  const missing: string[] = [];

  for (const row of SQUAD) {
    const existing = await prisma.player.findFirst({ where: { name: row.name } });
    if (!existing) {
      // Deliberately does not create anyone. Players are added in the app,
      // where their real jersey number is set; inventing one here would either
      // collide with a number already in use or plant a wrong one.
      missing.push(row.name);
      console.log(`  SKIPPED  ${row.name.padEnd(12)} — no player with this name`);
      continue;
    }
    await prisma.player.update({
      where: { id: existing.id },
      data: { openingBalance: row.opening },
    });
    console.log(`  updated  ${row.name.padEnd(12)} ${row.opening >= 0 ? " " : ""}${row.opening}`);
  }

  if (missing.length) {
    console.log(`\n  ! No player matched: ${missing.join(", ")}`);
    console.log("  ! Add them in the app first, then re-run.");
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
