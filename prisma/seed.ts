/**
 * Seeds a realistic starting ledger — the squad, venues, two tournaments and a
 * handful of played/upcoming matches carried over from the Excel workbook.
 *
 * Safe to re-run: every write is an upsert keyed on a natural unique field, and
 * match rosters are rebuilt rather than duplicated.
 */
import { PrismaClient, type PaymentMode } from "@prisma/client";

const prisma = new PrismaClient();

const PLAYERS = [
  { name: "Anbu", jerseyNumber: 7, mobileNumber: "98400 11007", defaultMatchFee: 200 },
  { name: "Elango", jerseyNumber: 10, mobileNumber: "98400 11010", defaultMatchFee: 200 },
  { name: "Mani", jerseyNumber: 3, mobileNumber: "98400 11003", defaultMatchFee: 200 },
  { name: "Madhavan", jerseyNumber: 18, mobileNumber: "98400 11018", defaultMatchFee: 200 },
  { name: "Karthik", jerseyNumber: 21, mobileNumber: "98400 11021", defaultMatchFee: 200 },
  { name: "Suresh", jerseyNumber: 5, mobileNumber: "98400 11005", defaultMatchFee: 200 },
  { name: "Vignesh", jerseyNumber: 11, mobileNumber: "98400 11011", defaultMatchFee: 200 },
  { name: "Prakash", jerseyNumber: 9, mobileNumber: "98400 11009", defaultMatchFee: 200 },
  { name: "Ramesh", jerseyNumber: 1, mobileNumber: "98400 11001", defaultMatchFee: 200 },
  { name: "Dinesh", jerseyNumber: 24, mobileNumber: "98400 11024", defaultMatchFee: 200 },
  { name: "Arun", jerseyNumber: 45, mobileNumber: "98400 11045", defaultMatchFee: 200 },
  // Colts pay the lower slab.
  { name: "Bala", jerseyNumber: 8, mobileNumber: "98400 11008", defaultMatchFee: 100 },
  { name: "Gokul", jerseyNumber: 77, mobileNumber: "98400 11077", defaultMatchFee: 100 },
  { name: "Naveen", jerseyNumber: 12, mobileNumber: "98400 11012", defaultMatchFee: 100 },
] as const;

const RETIRED = [
  { name: "Sathish", jerseyNumber: 33, mobileNumber: "98400 11033", defaultMatchFee: 100 },
] as const;

const GROUNDS = [
  { name: "YMCA Ground", location: "Nandanam, Chennai" },
  { name: "Marina Turf Arena", location: "Besant Nagar, Chennai" },
  { name: "Guindy Cricket Ground", location: "Guindy, Chennai" },
  { name: "MCC Corporation Ground", location: "Chetpet, Chennai" },
] as const;

const TOURNAMENTS = [
  { name: "Chennai Summer Cup 2026", overs: 20, totalFee: 8000 },
  { name: "Monsoon Shield 2026", overs: 25, totalFee: 6000 },
] as const;

/** Days relative to today, at a given IST hour. */
function day(offset: number, hour = 8, minute = 0): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  const iso = d.toISOString().slice(0, 10);
  return new Date(
    `${iso}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:30`,
  );
}

type SeedMatch = {
  key: string;
  date: Date;
  matchType: "TOURNAMENT" | "PRACTICE";
  matchNumber?: number;
  overs: number;
  opponentTeam: string;
  ground: string;
  tournament?: string;
  notes?: string;
  /** Player names in the XI. */
  squad?: string[];
  /** Names who still owe — everyone else in the squad paid in full. */
  unpaid?: string[];
  /** Names who paid in cash — the rest went by UPI. */
  cash?: string[];
  expenses?: { category: string; amount: number; note?: string }[];
};

const CORE = [
  "Anbu",
  "Elango",
  "Mani",
  "Madhavan",
  "Karthik",
  "Suresh",
  "Vignesh",
  "Prakash",
  "Ramesh",
  "Dinesh",
  "Arun",
];

const MATCHES: SeedMatch[] = [
  {
    key: "prac-1c",
    date: day(-63, 6, 30),
    matchType: "PRACTICE",
    overs: 20,
    opponentTeam: "Mylapore Mavericks",
    ground: "YMCA Ground",
    squad: [...CORE, "Bala", "Gokul"],
    cash: ["Elango", "Ramesh"],
    expenses: [
      { category: "Ball fee", amount: 280 },
      { category: "Ground fee", amount: 400, note: "Half share" },
      { category: "Water", amount: 150 },
    ],
  },
  {
    key: "prac-1d",
    date: day(-17, 6, 30),
    matchType: "PRACTICE",
    overs: 20,
    opponentTeam: "Ashok Nagar Avengers",
    ground: "Guindy Cricket Ground",
    squad: [...CORE, "Naveen"],
    unpaid: ["Naveen"],
    cash: ["Karthik"],
    expenses: [
      { category: "Ball fee", amount: 280 },
      { category: "Ground fee", amount: 400, note: "Half share" },
      { category: "Water", amount: 150 },
      { category: "Bakery", amount: 220 },
    ],
  },
  {
    key: "prac-0",
    date: day(-56, 6, 30),
    matchType: "PRACTICE",
    overs: 20,
    opponentTeam: "Saidapet Sixers",
    ground: "Guindy Cricket Ground",
    notes: "Season opener.",
    squad: [...CORE, "Bala", "Gokul", "Naveen"],
    cash: ["Anbu", "Mani", "Bala"],
    expenses: [
      { category: "Ball fee", amount: 280 },
      { category: "Ground fee", amount: 400, note: "Half share" },
      { category: "Water", amount: 150 },
    ],
  },
  {
    key: "prac-1b",
    date: day(-49, 6, 30),
    matchType: "PRACTICE",
    overs: 20,
    opponentTeam: "Kotturpuram Kings",
    ground: "MCC Corporation Ground",
    squad: [...CORE, "Gokul", "Naveen"],
    unpaid: ["Arun"],
    cash: ["Suresh", "Vignesh"],
    expenses: [
      { category: "Ball fee", amount: 280 },
      { category: "Ground fee", amount: 450, note: "Half share" },
      { category: "Water", amount: 160 },
      { category: "Fuel/Car", amount: 250 },
    ],
  },
  {
    key: "sc-m1",
    date: day(-42, 7, 30),
    matchType: "TOURNAMENT",
    matchNumber: 1,
    overs: 20,
    opponentTeam: "Royal Strikers",
    ground: "YMCA Ground",
    tournament: "Chennai Summer Cup 2026",
    notes: "Won by 4 wickets. Madhavan 52*.",
    squad: CORE,
    cash: ["Mani", "Ramesh"],
    expenses: [
      { category: "Tournament fee", amount: 2000, note: "First instalment" },
      { category: "Ball fee", amount: 320, note: "2 leather balls" },
      { category: "Ground fee", amount: 600, note: "Half share" },
      { category: "Water", amount: 180 },
      { category: "Umpire Fee", amount: 300, note: "Half share" },
      { category: "MoM", amount: 300, note: "Madhavan" },
    ],
  },
  {
    key: "sc-m2",
    date: day(-35, 7, 30),
    matchType: "TOURNAMENT",
    matchNumber: 2,
    overs: 20,
    opponentTeam: "Chepauk Chargers",
    ground: "YMCA Ground",
    tournament: "Chennai Summer Cup 2026",
    notes: "Lost by 12 runs.",
    squad: [...CORE.slice(0, 9), "Bala", "Gokul"],
    unpaid: ["Gokul"],
    cash: ["Suresh"],
    expenses: [
      { category: "Tournament fee", amount: 1500, note: "Second instalment" },
      { category: "Ball fee", amount: 320 },
      { category: "Ground fee", amount: 600, note: "Half share" },
      { category: "Water", amount: 200 },
      { category: "Bakery", amount: 300, note: "Tea break snacks" },
      { category: "Umpire Fee", amount: 300, note: "Half share" },
    ],
  },
  {
    key: "prac-1",
    date: day(-28, 6, 30),
    matchType: "PRACTICE",
    overs: 25,
    opponentTeam: "Anna Nagar XI",
    ground: "Guindy Cricket Ground",
    notes: "Friendly warm-up.",
    squad: [...CORE.slice(0, 8), "Naveen", "Bala"],
    unpaid: ["Naveen", "Bala"],
    cash: ["Anbu", "Elango"],
    expenses: [
      { category: "Ball fee", amount: 280 },
      { category: "Ground fee", amount: 400, note: "Half share" },
      { category: "Water", amount: 150 },
      { category: "Fuel/Car", amount: 300, note: "Two cars" },
    ],
  },
  {
    key: "ms-m1",
    date: day(-21, 8),
    matchType: "TOURNAMENT",
    matchNumber: 1,
    overs: 25,
    opponentTeam: "Velachery Warriors",
    ground: "Marina Turf Arena",
    tournament: "Monsoon Shield 2026",
    notes: "Won by 30 runs. Anbu 4/22.",
    squad: CORE,
    unpaid: ["Dinesh"],
    cash: ["Mani", "Prakash", "Arun"],
    expenses: [
      { category: "Tournament fee", amount: 1000, note: "First instalment" },
      { category: "Ball fee", amount: 340 },
      { category: "Ground fee", amount: 750, note: "Half share" },
      { category: "Water", amount: 220 },
      { category: "Food", amount: 600, note: "Post-match lunch" },
      { category: "Umpire Fee", amount: 350, note: "Half share" },
      { category: "MoM", amount: 300, note: "Anbu" },
    ],
  },
  {
    key: "prac-2",
    date: day(-10, 6, 30),
    matchType: "PRACTICE",
    overs: 20,
    opponentTeam: "Adyar Aces",
    ground: "MCC Corporation Ground",
    squad: [...CORE.slice(0, 7), "Gokul", "Naveen", "Bala"],
    unpaid: ["Gokul", "Naveen", "Karthik"],
    cash: ["Ramesh"],
    expenses: [
      { category: "Ball fee", amount: 300 },
      { category: "Ground fee", amount: 450, note: "Half share" },
      { category: "Water", amount: 160 },
      { category: "Bakery", amount: 250 },
      { category: "Net practice slot", amount: 500, note: "Booked via club (Others)" },
    ],
  },
  // Upcoming — deliberately no roster or expenses yet.
  {
    key: "ms-m2",
    date: day(6, 8),
    matchType: "TOURNAMENT",
    matchNumber: 2,
    overs: 25,
    opponentTeam: "Porur Panthers",
    ground: "Marina Turf Arena",
    tournament: "Monsoon Shield 2026",
    notes: "Report by 7:15 AM.",
  },
  {
    key: "prac-3",
    date: day(13, 6, 30),
    matchType: "PRACTICE",
    overs: 30,
    opponentTeam: "Tambaram Titans",
    ground: "Guindy Cricket Ground",
  },
  {
    key: "ms-m3",
    date: day(20, 8),
    matchType: "TOURNAMENT",
    matchNumber: 3,
    overs: 25,
    opponentTeam: "Perambur Panthers",
    ground: "Marina Turf Arena",
    tournament: "Monsoon Shield 2026",
  },
];

async function main() {
  console.log("Seeding Eleven Super Kings…");

  // jerseyNumber isn't a unique key any more, so re-runs match by name instead.
  for (const p of PLAYERS) {
    const existing = await prisma.player.findFirst({ where: { name: p.name } });
    if (existing) {
      await prisma.player.update({ where: { id: existing.id }, data: { ...p, status: "ACTIVE" } });
    } else {
      await prisma.player.create({ data: { ...p, status: "ACTIVE" } });
    }
  }
  for (const p of RETIRED) {
    const existing = await prisma.player.findFirst({ where: { name: p.name } });
    if (existing) {
      await prisma.player.update({ where: { id: existing.id }, data: { ...p, status: "INACTIVE" } });
    } else {
      await prisma.player.create({ data: { ...p, status: "INACTIVE" } });
    }
  }
  console.log(`  ${PLAYERS.length + RETIRED.length} players`);

  for (const g of GROUNDS) {
    await prisma.ground.upsert({ where: { name: g.name }, create: g, update: g });
  }
  console.log(`  ${GROUNDS.length} grounds`);

  for (const t of TOURNAMENTS) {
    await prisma.tournament.upsert({ where: { name: t.name }, create: t, update: t });
  }
  console.log(`  ${TOURNAMENTS.length} tournaments`);

  const players = await prisma.player.findMany();
  const playerByName = new Map(players.map((p) => [p.name, p]));
  const grounds = await prisma.ground.findMany();
  const groundByName = new Map(grounds.map((g) => [g.name, g]));
  const tournaments = await prisma.tournament.findMany();
  const tournamentByName = new Map(tournaments.map((t) => [t.name, t]));

  for (const m of MATCHES) {
    const ground = groundByName.get(m.ground);
    if (!ground) throw new Error(`Unknown ground: ${m.ground}`);
    const tournament = m.tournament ? tournamentByName.get(m.tournament) : null;

    const data = {
      date: m.date,
      matchType: m.matchType,
      matchNumber: m.matchNumber ?? null,
      overs: m.overs,
      opponentTeam: m.opponentTeam,
      groundId: ground.id,
      tournamentId: tournament?.id ?? null,
      notes: m.notes ?? null,
    };

    // No natural key on Match, so match on the opponent + day pair.
    const existing = await prisma.match.findFirst({
      where: {
        opponentTeam: m.opponentTeam,
        date: {
          gte: new Date(m.date.getTime() - 12 * 3600_000),
          lte: new Date(m.date.getTime() + 12 * 3600_000),
        },
      },
    });

    const match = existing
      ? await prisma.match.update({ where: { id: existing.id }, data })
      : await prisma.match.create({ data });

    // Rebuild the child rows so re-seeding never double-counts money.
    await prisma.matchPlayer.deleteMany({ where: { matchId: match.id } });
    await prisma.matchExpense.deleteMany({ where: { matchId: match.id } });

    if (m.squad?.length) {
      const unpaid = new Set(m.unpaid ?? []);
      const cash = new Set(m.cash ?? []);

      await prisma.matchPlayer.createMany({
        data: m.squad.map((name) => {
          const player = playerByName.get(name);
          if (!player) throw new Error(`Unknown player: ${name}`);
          const payable = player.defaultMatchFee;
          const collected = unpaid.has(name) ? 0 : payable;
          const mode: PaymentMode | null =
            collected > 0 ? (cash.has(name) ? "CASH" : "UPI") : null;
          return {
            matchId: match.id,
            playerId: player.id,
            payableAmount: payable,
            collectedAmount: collected,
            paymentMode: mode,
            isPresent: true,
          };
        }),
      });
    }

    if (m.expenses?.length) {
      await prisma.matchExpense.createMany({
        data: m.expenses.map((e) => ({
          matchId: match.id,
          category: e.category,
          amount: e.amount,
          note: e.note ?? null,
        })),
      });
    }
  }
  console.log(`  ${MATCHES.length} matches`);

  const collected = await prisma.matchPlayer.aggregate({ _sum: { collectedAmount: true } });
  const spent = await prisma.matchExpense.aggregate({ _sum: { amount: true } });
  const balance = (collected._sum.collectedAmount ?? 0) - (spent._sum.amount ?? 0);
  console.log(
    `Done. Collected ₹${collected._sum.collectedAmount ?? 0}, spent ₹${spent._sum.amount ?? 0}, balance ₹${balance}.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
