import "server-only";

import { prisma } from "@/lib/prisma";
import { TOURNAMENT_FEE_CATEGORY } from "@/lib/constants";
import { istParts, round2 } from "@/lib/format";

/* ------------------------------------------------------------------ */
/* Time helpers                                                        */
/* ------------------------------------------------------------------ */

/**
 * A match belongs to "played" or "upcoming" purely by its date, with the
 * boundary at midnight IST — a match earlier today still counts as played.
 */
export function startOfTodayIST(): Date {
  const p = istParts(new Date());
  const pad = (n: number) => String(n).padStart(2, "0");
  // IST is UTC+5:30, so midnight IST is 18:30 UTC the previous day.
  return new Date(`${p.year}-${pad(p.month)}-${pad(p.day)}T00:00:00+05:30`);
}

/* ------------------------------------------------------------------ */
/* Team-wide totals                                                    */
/* ------------------------------------------------------------------ */

export type TeamSummary = {
  totalPayable: number;
  totalCollected: number;
  totalExpenses: number;
  /** Collections minus expenses — cash the team actually holds. */
  teamBalance: number;
  /** Everything still owed by players across every match. */
  totalPending: number;
  matchesPlayed: number;
  upcomingCount: number;
  activePlayers: number;
};

export async function getTeamSummary(): Promise<TeamSummary> {
  const today = startOfTodayIST();

  const [playerAgg, expenseAgg, playedCount, upcomingCount, activePlayers, openingAgg] =
    await Promise.all([
      prisma.matchPlayer.aggregate({
        _sum: { payableAmount: true, collectedAmount: true },
      }),
      prisma.matchExpense.aggregate({ _sum: { amount: true } }),
      prisma.match.count({ where: { date: { lt: today } } }),
      prisma.match.count({ where: { date: { gte: today } } }),
      prisma.player.count({ where: { status: "ACTIVE" } }),
      prisma.player.aggregate({ _sum: { openingBalance: true } }),
    ]);

  const totalPayable = round2(playerAgg._sum.payableAmount ?? 0);
  const totalCollected = round2(playerAgg._sum.collectedAmount ?? 0);
  const totalExpenses = round2(expenseAgg._sum.amount ?? 0);
  const totalOpening = round2(openingAgg._sum.openingBalance ?? 0);

  return {
    totalPayable,
    totalCollected,
    totalExpenses,
    // Brought-forward balances are money owed, not money held, so they move
    // the pending figure but never the team's cash balance.
    teamBalance: round2(totalCollected - totalExpenses),
    totalPending: round2(totalOpening + totalPayable - totalCollected),
    matchesPlayed: playedCount,
    upcomingCount,
    activePlayers,
  };
}

/** Formula 2: total collected across all matches − total expenses. */
export async function getTeamBalance(): Promise<number> {
  const [collected, expenses] = await Promise.all([
    prisma.matchPlayer.aggregate({ _sum: { collectedAmount: true } }),
    prisma.matchExpense.aggregate({ _sum: { amount: true } }),
  ]);
  return round2((collected._sum.collectedAmount ?? 0) - (expenses._sum.amount ?? 0));
}

/* ------------------------------------------------------------------ */
/* Player pendings                                                     */
/* ------------------------------------------------------------------ */

export type PlayerPending = {
  id: number;
  name: string;
  jerseyNumber: number;
  mobileNumber: string | null;
  status: "ACTIVE" | "INACTIVE";
  defaultMatchFee: number;
  /** Balance carried in from the old ledger. Positive = owes. */
  openingBalance: number;
  matchesPlayed: number;
  totalPayable: number;
  totalCollected: number;
  /**
   * Formula 1, plus anything brought forward:
   * opening + payable − collected. Negative means the player is in credit.
   */
  pending: number;
};

/**
 * Formula 1, for everyone at once. One groupBy instead of N queries so the
 * dashboard stays fast as the season grows.
 */
export async function getPlayerPendings(): Promise<PlayerPending[]> {
  const [players, grouped] = await Promise.all([
    prisma.player.findMany({ orderBy: [{ status: "asc" }, { jerseyNumber: "asc" }] }),
    prisma.matchPlayer.groupBy({
      by: ["playerId"],
      _sum: { payableAmount: true, collectedAmount: true },
      _count: { _all: true },
      where: { isPresent: true },
    }),
  ]);

  // Absent rows carry payable 0 / collected 0, but a correction could still be
  // recorded against one, so total money separately from the appearance count.
  const money = await prisma.matchPlayer.groupBy({
    by: ["playerId"],
    _sum: { payableAmount: true, collectedAmount: true },
  });

  const appearances = new Map(grouped.map((g) => [g.playerId, g._count._all]));
  const sums = new Map(money.map((g) => [g.playerId, g._sum]));

  return players.map((p) => {
    const s = sums.get(p.id);
    const totalPayable = round2(s?.payableAmount ?? 0);
    const totalCollected = round2(s?.collectedAmount ?? 0);
    return {
      id: p.id,
      name: p.name,
      jerseyNumber: p.jerseyNumber,
      mobileNumber: p.mobileNumber,
      status: p.status,
      defaultMatchFee: p.defaultMatchFee,
      openingBalance: round2(p.openingBalance),
      matchesPlayed: appearances.get(p.id) ?? 0,
      totalPayable,
      totalCollected,
      pending: round2(p.openingBalance + totalPayable - totalCollected),
    };
  });
}

/** Only those who actually owe money, biggest debt first. */
export async function getOutstandingPlayers(): Promise<PlayerPending[]> {
  const all = await getPlayerPendings();
  return all.filter((p) => p.pending > 0).sort((a, b) => b.pending - a.pending);
}

export async function getPlayerLedger(playerId: number) {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: {
      matchPlayers: {
        include: { match: { include: { ground: true, tournament: true } } },
        orderBy: { match: { date: "desc" } },
      },
    },
  });
  if (!player) return null;

  const totalPayable = round2(
    player.matchPlayers.reduce((sum, mp) => sum + mp.payableAmount, 0),
  );
  const totalCollected = round2(
    player.matchPlayers.reduce((sum, mp) => sum + mp.collectedAmount, 0),
  );

  return {
    player,
    rows: player.matchPlayers,
    totalPayable,
    totalCollected,
    openingBalance: round2(player.openingBalance),
    pending: round2(player.openingBalance + totalPayable - totalCollected),
    matchesPlayed: player.matchPlayers.filter((mp) => mp.isPresent).length,
  };
}

/* ------------------------------------------------------------------ */
/* Matches                                                             */
/* ------------------------------------------------------------------ */

export type MatchTotals = {
  collection: number;
  payable: number;
  pending: number;
  expenses: number;
  /** Formula 3: collection − expenses for this fixture alone. */
  net: number;
  presentCount: number;
};

export function computeMatchTotals(match: {
  players: { payableAmount: number; collectedAmount: number; isPresent: boolean }[];
  expenses: { amount: number }[];
}): MatchTotals {
  const collection = round2(match.players.reduce((s, p) => s + p.collectedAmount, 0));
  const payable = round2(match.players.reduce((s, p) => s + p.payableAmount, 0));
  const expenses = round2(match.expenses.reduce((s, e) => s + e.amount, 0));
  return {
    collection,
    payable,
    pending: round2(payable - collection),
    expenses,
    net: round2(collection - expenses),
    presentCount: match.players.filter((p) => p.isPresent).length,
  };
}

const matchListInclude = {
  ground: true,
  tournament: true,
  players: { select: { payableAmount: true, collectedAmount: true, isPresent: true } },
  expenses: { select: { amount: true } },
} as const;

export async function getMatchesSplit(tournamentId?: number) {
  const today = startOfTodayIST();
  const tournamentFilter = tournamentId ? { tournamentId } : {};
  const [played, upcoming] = await Promise.all([
    prisma.match.findMany({
      where: { date: { lt: today }, ...tournamentFilter },
      include: matchListInclude,
      orderBy: { date: "desc" },
    }),
    prisma.match.findMany({
      where: { date: { gte: today }, ...tournamentFilter },
      include: matchListInclude,
      orderBy: { date: "asc" },
    }),
  ]);
  return {
    played: played.map((m) => ({ ...m, totals: computeMatchTotals(m) })),
    upcoming: upcoming.map((m) => ({ ...m, totals: computeMatchTotals(m) })),
  };
}

export async function getRecentMatches(limit = 5) {
  const today = startOfTodayIST();
  const matches = await prisma.match.findMany({
    where: { date: { lt: today } },
    include: matchListInclude,
    orderBy: { date: "desc" },
    take: limit,
  });
  return matches.map((m) => ({ ...m, totals: computeMatchTotals(m) }));
}

export async function getUpcomingMatches(limit = 5) {
  const today = startOfTodayIST();
  const matches = await prisma.match.findMany({
    where: { date: { gte: today } },
    include: { ground: true, tournament: true },
    orderBy: { date: "asc" },
    take: limit,
  });
  return matches;
}

export async function getMatchDetail(matchId: number) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      ground: true,
      tournament: true,
      expenses: { orderBy: { id: "asc" } },
      players: {
        include: { player: true },
        orderBy: [{ isPresent: "desc" }, { player: { jerseyNumber: "asc" } }],
      },
    },
  });
  if (!match) return null;
  return { match, totals: computeMatchTotals(match) };
}

/* ------------------------------------------------------------------ */
/* Tournaments                                                         */
/* ------------------------------------------------------------------ */

export type TournamentOutstanding = {
  id: number;
  name: string;
  overs: number;
  totalFee: number;
  /** Sum of "Tournament fee" expenses booked against this tournament's matches. */
  feePaid: number;
  /** Formula 4: totalFee − feePaid. */
  outstanding: number;
  matchCount: number;
  totalMatches: number | null;
  grounds: { id: number; name: string; location: string | null }[];
  collection: number;
  expenses: number;
  net: number;
};

export async function getTournamentOutstandings(): Promise<TournamentOutstanding[]> {
  const tournaments = await prisma.tournament.findMany({
    include: {
      grounds: { select: { id: true, name: true, location: true } },
      matches: {
        include: {
          players: { select: { collectedAmount: true } },
          expenses: { select: { amount: true, category: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return tournaments.map((t) => {
    let feePaid = 0;
    let collection = 0;
    let expenses = 0;

    for (const match of t.matches) {
      for (const p of match.players) collection += p.collectedAmount;
      for (const e of match.expenses) {
        expenses += e.amount;
        if (e.category === TOURNAMENT_FEE_CATEGORY) feePaid += e.amount;
      }
    }

    return {
      id: t.id,
      name: t.name,
      overs: t.overs,
      totalFee: round2(t.totalFee),
      feePaid: round2(feePaid),
      outstanding: round2(t.totalFee - feePaid),
      /** Fixtures actually recorded against this tournament. */
      matchCount: t.matches.length,
      /** Fixtures it is scheduled to have, when known. */
      totalMatches: t.totalMatches,
      grounds: t.grounds,
      collection: round2(collection),
      expenses: round2(expenses),
      net: round2(collection - expenses),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Expense breakdown                                                   */
/* ------------------------------------------------------------------ */

export async function getExpenseBreakdown(): Promise<{ category: string; amount: number }[]> {
  const grouped = await prisma.matchExpense.groupBy({
    by: ["category"],
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
  });
  return grouped.map((g) => ({ category: g.category, amount: round2(g._sum.amount ?? 0) }));
}

export async function getCollectionByMode(): Promise<{ mode: string; amount: number }[]> {
  const grouped = await prisma.matchPlayer.groupBy({
    by: ["paymentMode"],
    _sum: { collectedAmount: true },
    where: { collectedAmount: { gt: 0 } },
  });
  return grouped.map((g) => ({
    mode: g.paymentMode ?? "Unrecorded",
    amount: round2(g._sum.collectedAmount ?? 0),
  }));
}
