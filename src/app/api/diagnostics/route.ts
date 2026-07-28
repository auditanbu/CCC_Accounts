import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  getExpenseBreakdown,
  getOutstandingPlayers,
  getRecentMatches,
  getTeamSummary,
  getTournamentOutstandings,
  getUpcomingMatches,
} from "@/lib/queries";
import { formatDate, formatMoney, istParts } from "@/lib/format";
import { isAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Runs each piece of work the dashboard does, individually, and reports which
 * one fails and why.
 *
 * Next.js redacts server error messages in production, so a failing page gives
 * the browser nothing but a digest. Rather than reading deploy logs to find out
 * what broke, hit this: every step is caught separately, so the response names
 * the failing step and carries its real message.
 */
async function step(name: string, fn: () => unknown | Promise<unknown>) {
  const started = Date.now();
  try {
    const value = await fn();
    return { name, ok: true, ms: Date.now() - started, sample: summarise(value) };
  } catch (error) {
    return {
      name,
      ok: false,
      ms: Date.now() - started,
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    };
  }
}

/** Keep the response small — shape and size, not full payloads. */
function summarise(value: unknown): unknown {
  if (Array.isArray(value)) return `array(${value.length})`;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value).slice(0, 6)) {
      out[k] = typeof v === "object" && v !== null ? "…" : v;
    }
    return out;
  }
  return value;
}

export async function GET() {
  const steps = [];

  steps.push(await step("env", () => ({
    node: process.version,
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    hasAdminPin: Boolean(process.env.ADMIN_PIN),
    authSecretLength: (process.env.AUTH_SECRET ?? "").length,
    commit: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? "unknown",
    tz: process.env.TZ ?? "(unset)",
  })));

  // Does this runtime carry the locale data the old code depended on? Answers
  // whether an ICU-related failure is even possible here.
  steps.push(await step("intl-timezone", () =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date()),
  ));
  steps.push(await step("intl-locale", () => new Intl.NumberFormat("en-IN").format(1234567)));
  steps.push(await step("format-helpers", () => ({
    date: formatDate(new Date()),
    money: formatMoney(123456.5),
    ist: istParts(new Date()).monthShort,
  })));

  steps.push(await step("db-connect", () => prisma.$queryRaw`SELECT 1`));
  steps.push(await step("db-counts", async () => ({
    players: await prisma.player.count(),
    matches: await prisma.match.count(),
    rosterRows: await prisma.matchPlayer.count(),
    expenses: await prisma.matchExpense.count(),
  })));

  steps.push(await step("session-isAdmin", () => isAdmin()));
  steps.push(await step("getTeamSummary", () => getTeamSummary()));
  steps.push(await step("getRecentMatches", () => getRecentMatches(3)));
  steps.push(await step("getUpcomingMatches", () => getUpcomingMatches(3)));
  steps.push(await step("getOutstandingPlayers", () => getOutstandingPlayers()));
  steps.push(await step("getExpenseBreakdown", () => getExpenseBreakdown()));
  steps.push(await step("getTournamentOutstandings", () => getTournamentOutstandings()));

  const failed = steps.filter((s) => !s.ok);
  return NextResponse.json(
    {
      status: failed.length ? "failing" : "ok",
      failingSteps: failed.map((s) => s.name),
      steps,
    },
    { status: failed.length ? 500 : 200 },
  );
}
