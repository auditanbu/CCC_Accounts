import type { Metadata } from "next";
import Link from "next/link";

import { MatchCard } from "@/components/MatchCard";
import { EmptyState, Section } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { PlusIcon } from "@/components/ui/Icons";
import { getMatchesSplit, getTeamSummary } from "@/lib/queries";
import { isAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Matches" };

export default async function MatchesPage() {
  const [{ played, upcoming }, summary, admin] = await Promise.all([
    getMatchesSplit(),
    getTeamSummary(),
    isAdmin(),
  ]);

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

      <div className="card grid grid-cols-3 divide-x divide-separator/70">
        <div className="px-3 py-3.5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-label-secondary">
            Collected
          </p>
          <p className="mt-1 text-[17px] font-bold">
            <Money value={summary.totalCollected} />
          </p>
        </div>
        <div className="px-3 py-3.5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-label-secondary">
            Expenses
          </p>
          <p className="mt-1 text-[17px] font-bold">
            <Money value={summary.totalExpenses} />
          </p>
        </div>
        <div className="px-3 py-3.5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-label-secondary">
            Balance
          </p>
          <p className="mt-1 text-[17px] font-bold">
            <Money value={summary.teamBalance} tone="ledger" />
          </p>
        </div>
      </div>

      {upcoming.length > 0 ? (
        <Section title={`Upcoming schedules · ${upcoming.length}`}>
          <div className="space-y-3">
            {upcoming.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </Section>
      ) : null}

      <Section title={`Played matches · ${played.length}`}>
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
          <div className="space-y-3">
            {played.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
