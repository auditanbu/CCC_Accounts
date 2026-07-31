import type { Metadata } from "next";
import Link from "next/link";

import { MatchTypeBadge, ResultBadge } from "@/components/MatchCard";
import { EmptyState, Section } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { ChevronRightIcon, PlusIcon } from "@/components/ui/Icons";
import { formatMonthYear, formatTime, istParts, relativeDay } from "@/lib/format";
import { getMatchesSplit } from "@/lib/queries";
import { isAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Matches" };

type Row = Awaited<ReturnType<typeof getMatchesSplit>>["played"][number];

/** Groups matches under a "Month Year" heading, like the iOS Calendar list view. */
function groupByMonth(matches: Row[]): { key: string; label: string; items: Row[] }[] {
  const groups = new Map<string, { label: string; items: Row[] }>();
  for (const m of matches) {
    const label = formatMonthYear(m.date);
    const existing = groups.get(label);
    if (existing) existing.items.push(m);
    else groups.set(label, { label, items: [m] });
  }
  return [...groups.entries()].map(([key, v]) => ({ key, ...v }));
}

function MatchRow({ match, showMoney }: { match: Row; showMoney: boolean }) {
  const p = istParts(match.date);
  const dateParts = { weekday: p.weekdayShort, day: String(p.day).padStart(2, "0") };

  return (
    <li>
      <Link href={`/matches/${match.id}`} className="list-row-link">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-black/[0.04]">
          <span className="text-center leading-none">
            <span className="block text-[9px] font-bold uppercase tracking-wide text-label-secondary">
              {dateParts.weekday}
            </span>
            <span className="mt-0.5 block text-[17px] font-bold">{dateParts.day}</span>
          </span>
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-semibold">vs {match.opponentTeam}</span>
          </span>
          <span className="mt-0.5 block truncate text-[12px] text-label-secondary">
            {formatTime(match.date)} · 🏟 {match.ground.name} · {match.overs} ov
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            <MatchTypeBadge type={match.matchType} />
            {match.result ? <ResultBadge result={match.result} /> : null}
            {match.tournament ? (
              <span className="badge bg-black/[0.05] text-label-secondary">
                {match.tournament.name}
                {match.matchNumber ? ` · M${match.matchNumber}` : ""}
              </span>
            ) : null}
          </span>
        </span>

        <span className="shrink-0 text-right">
          {showMoney ? (
            <span className="block text-[14px] font-semibold">
              <Money value={match.totals.net} tone="ledger" />
            </span>
          ) : (
            <span className="block text-[12px] text-label-secondary">
              {relativeDay(match.date)}
            </span>
          )}
        </span>
        <ChevronRightIcon className="shrink-0 text-label-tertiary" />
      </Link>
    </li>
  );
}

export default async function MatchesPage() {
  const [{ played, upcoming }, admin] = await Promise.all([getMatchesSplit(), isAdmin()]);

  return (
    <div className="space-y-7">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Matches</h1>
          <p className="mt-1 text-[14px] text-label-secondary">
            {played.length} played · {upcoming.length} upcoming
          </p>
        </div>
        {admin ? (
          <Link href="/matches/new" className="btn-primary shrink-0">
            <PlusIcon width={18} height={18} strokeWidth={2.2} />
            New
          </Link>
        ) : null}
      </div>

      <Section title={`Upcoming · ${upcoming.length}`}>
        {upcoming.length === 0 ? (
          <EmptyState
            icon="📅"
            title="Nothing scheduled"
            description="Schedule a match ahead of time — accounts can be filled in after it's played."
            action={
              admin ? (
                <Link href="/matches/new" className="btn-tinted btn-sm">
                  Schedule a match
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-4">
            {groupByMonth(upcoming).map((group) => (
              <div key={group.key} className="space-y-2">
                <p className="px-1 text-[12px] font-semibold uppercase tracking-wide text-label-tertiary">
                  {group.label}
                </p>
                <ul className="list-group">
                  {group.items.map((m) => (
                    <MatchRow key={m.id} match={m} showMoney={false} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title={`Played · ${played.length}`}>
        {played.length === 0 ? (
          <EmptyState
            icon="🏏"
            title="No matches recorded"
            description="Create a match to start tracking collections and expenses."
            action={
              admin ? (
                <Link href="/matches/new" className="btn-tinted btn-sm">
                  Create the first match
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-4">
            {groupByMonth(played).map((group) => (
              <div key={group.key} className="space-y-2">
                <p className="px-1 text-[12px] font-semibold uppercase tracking-wide text-label-tertiary">
                  {group.label}
                </p>
                <ul className="list-group">
                  {group.items.map((m) => (
                    <MatchRow key={m.id} match={m} showMoney />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
