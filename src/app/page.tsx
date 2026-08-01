import Link from "next/link";

import { MatchCard } from "@/components/MatchCard";
import { EmptyState, Section } from "@/components/ui/Card";
import { Money, StatCard } from "@/components/ui/Money";
import { ChevronRightIcon, PlusIcon } from "@/components/ui/Icons";
import { CATEGORY_COLORS, TEAM_NAME } from "@/lib/constants";
import { avatarLabel, formatDate, formatMoney, formatTime } from "@/lib/format";
import {
  getExpenseBreakdown,
  getPlayerPendings,
  getRecentMatches,
  getTeamSummary,
  getTournamentOutstandings,
  getUpcomingMatches,
} from "@/lib/queries";
import { isAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [summary, recent, upcoming, players, breakdown, tournaments, admin] =
    await Promise.all([
      getTeamSummary(),
      getRecentMatches(3),
      getUpcomingMatches(3),
      getPlayerPendings(),
      getExpenseBreakdown(),
      getTournamentOutstandings(),
      isAdmin(),
    ]);

  const outstanding = players.filter((p) => p.pending > 0).sort((a, b) => b.pending - a.pending);
  const totalPending = players.reduce((s, p) => s + Math.max(p.pending, 0), 0);
  // The flip side of pending — players who've paid in more than they owe.
  const totalExcess = players.reduce((s, p) => s + Math.max(-p.pending, 0), 0);

  const topExpenses = breakdown.slice(0, 5);
  const maxExpense = topExpenses[0]?.amount ?? 0;
  const openTournaments = tournaments.filter((t) => t.outstanding > 0);

  return (
    <div className="space-y-7">
      {/* Hero: the one number everyone opens the app for. */}
      <section className="animate-fade-in-up">
        <p className="text-[13px] font-medium text-label-secondary">{TEAM_NAME}</p>
        <h1 className="page-title mt-0.5">Team Balance</h1>
        <p className="mt-2 text-[44px] font-bold leading-none tracking-[-0.03em] sm:text-[52px]">
          <Money value={summary.teamBalance} tone="ledger" />
        </p>
        <p className="mt-2 text-[13px] text-label-secondary">
          {formatMoney(summary.totalCollected)} collected − {formatMoney(summary.totalExpenses)}{" "}
          spent across {summary.matchesPlayed} match{summary.matchesPlayed === 1 ? "" : "es"}
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Collected"
          value={summary.totalCollected}
          accent="bg-ios-green"
          caption="All matches"
        />
        <StatCard
          label="Expenses"
          value={summary.totalExpenses}
          accent="bg-ios-red"
          caption="All matches"
        />
        <StatCard
          label="Pending"
          value={totalPending}
          tone={totalPending > 0 ? "negative" : "plain"}
          accent="bg-ios-orange"
          caption={`${outstanding.length} player${outstanding.length === 1 ? "" : "s"} owe`}
        />
        <StatCard
          label="Excess"
          value={totalExcess}
          tone={totalExcess > 0 ? "positive" : "plain"}
          accent="bg-ios-green"
          caption="Paid in over what's owed"
        />
      </div>

      {admin ? (
        <div className="flex flex-wrap gap-2">
          <Link href="/matches/new" className="btn-primary">
            <PlusIcon width={18} height={18} strokeWidth={2.2} />
            New match
          </Link>
          <Link href="/grounds" className="btn-secondary">
            Grounds
          </Link>
        </div>
      ) : null}

      {/* Pendings */}
      <Section
        title="Player pendings"
        action={
          <Link href="/players" className="text-[14px] font-medium text-ios-blue">
            All players
          </Link>
        }
      >
        {outstanding.length === 0 ? (
          <EmptyState
            icon="✅"
            title="Everyone's settled up"
            description="No player has an outstanding balance right now."
          />
        ) : (
          <ul className="list-group">
            {outstanding.slice(0, 6).map((p) => (
              <li key={p.id}>
                <Link href={`/players/${p.id}`} className="list-row-link">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ios-orange/12 text-[13px] font-semibold text-ios-orange">
                    {avatarLabel(p.name, p.jerseyNumber)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{p.name}</span>
                    <span className="block text-[12px] text-label-secondary">
                      {p.jerseyNumber !== null ? `#${p.jerseyNumber} · ` : ""}
                      {p.matchesPlayed} match
                      {p.matchesPlayed === 1 ? "" : "es"}
                    </span>
                  </span>
                  <span className="text-[15px] font-semibold">
                    <Money value={p.pending} tone="negative" />
                  </span>
                  <ChevronRightIcon className="shrink-0 text-label-tertiary" />
                </Link>
              </li>
            ))}
            {outstanding.length > 6 ? (
              <li>
                <Link href="/players" className="list-row-link justify-center text-[14px] font-medium text-ios-blue">
                  +{outstanding.length - 6} more
                </Link>
              </li>
            ) : null}
          </ul>
        )}
      </Section>

      {/* Upcoming */}
      <Section
        title="Upcoming"
        action={
          <Link href="/matches" className="text-[14px] font-medium text-ios-blue">
            Schedule
          </Link>
        }
      >
        {upcoming.length === 0 ? (
          <EmptyState
            icon="📅"
            title="Nothing scheduled"
            description="Add an upcoming fixture to start planning."
            action={
              admin ? (
                <Link href="/matches/new" className="btn-tinted btn-sm">
                  Schedule a match
                </Link>
              ) : undefined
            }
          />
        ) : (
          <ul className="list-group">
            {upcoming.map((m) => (
              <li key={m.id}>
                <Link href={`/matches/${m.id}`} className="list-row-link">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ios-blue/10 text-ios-blue">
                    <span className="text-center leading-none">
                      <span className="block text-[9px] font-bold uppercase tracking-wide">
                        {formatDate(m.date).split(" ")[1]}
                      </span>
                      <span className="block text-[16px] font-bold">
                        {formatDate(m.date).split(" ")[0]}
                      </span>
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">
                      vs {m.opponentTeam}
                    </span>
                    <span className="block truncate text-[12px] text-label-secondary">
                      {formatTime(m.date)} · {m.ground.name} · {m.overs} ov
                    </span>
                  </span>
                  <ChevronRightIcon className="shrink-0 text-label-tertiary" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Recent matches */}
      <Section
        title="Recent matches"
        action={
          <Link href="/matches" className="text-[14px] font-medium text-ios-blue">
            All matches
          </Link>
        }
      >
        {recent.length === 0 ? (
          <EmptyState
            icon="🏏"
            title="No matches yet"
            description="Once you record a match, its accounts show up here."
          />
        ) : (
          <div className="space-y-3">
            {recent.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        )}
      </Section>

      {/* Tournament dues */}
      {openTournaments.length > 0 ? (
        <Section
          title="Tournament dues"
          action={
            <Link href="/tournaments" className="text-[14px] font-medium text-ios-blue">
              All cups
            </Link>
          }
        >
          <ul className="list-group">
            {openTournaments.map((t) => (
              <li key={t.id} className="list-row">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{t.name}</span>
                  <span className="block text-[12px] text-label-secondary">
                    {formatMoney(t.feePaid)} paid of {formatMoney(t.totalFee)}
                  </span>
                </span>
                <span className="text-[15px] font-semibold">
                  <Money value={t.outstanding} tone="negative" />
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* Where the money went */}
      {topExpenses.length > 0 ? (
        <Section title="Where the money went">
          <div className="card-pad space-y-3">
            {topExpenses.map((e) => (
              <div key={e.category}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 text-[14px]">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${CATEGORY_COLORS[e.category] ?? "bg-ios-gray"}`}
                      aria-hidden
                    />
                    <span className="truncate">{e.category}</span>
                  </span>
                  <span className="tnum shrink-0 text-[14px] font-semibold">
                    {formatMoney(e.amount)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
                  <div
                    className={`h-full rounded-full ${CATEGORY_COLORS[e.category] ?? "bg-ios-gray"}`}
                    style={{ width: `${maxExpense > 0 ? (e.amount / maxExpense) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>
      ) : null}
    </div>
  );
}
