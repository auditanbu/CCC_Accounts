import type { Metadata } from "next";
import Link from "next/link";

import { AddTournamentForm, EditTournamentPanel } from "@/components/TournamentForms";
import { EmptyState, Section } from "@/components/ui/Card";
import { Money, StatCard } from "@/components/ui/Money";
import { TOURNAMENT_FEE_CATEGORY } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { getTournamentOutstandings } from "@/lib/queries";
import { isAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tournaments" };

export default async function TournamentsPage() {
  const [tournaments, admin, grounds] = await Promise.all([
    getTournamentOutstandings(),
    isAdmin(),
    prisma.ground.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, location: true },
    }),
  ]);

  const totalFees = tournaments.reduce((s, t) => s + t.totalFee, 0);
  const totalPaid = tournaments.reduce((s, t) => s + t.feePaid, 0);
  const totalOutstanding = tournaments.reduce((s, t) => s + Math.max(t.outstanding, 0), 0);

  return (
    <div className="space-y-7">
      <div>
        <h1 className="page-title">Tournaments</h1>
        <p className="mt-1 text-[14px] text-label-secondary">
          Entry fees tracked against &ldquo;{TOURNAMENT_FEE_CATEGORY}&rdquo; expenses.
        </p>
      </div>

      {tournaments.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Total fees" value={totalFees} accent="bg-ios-indigo" />
          <StatCard label="Paid" value={totalPaid} accent="bg-ios-green" />
          <StatCard
            label="Outstanding"
            value={totalOutstanding}
            tone={totalOutstanding > 0 ? "negative" : "plain"}
            accent="bg-ios-orange"
          />
        </div>
      ) : null}

      {admin ? <AddTournamentForm grounds={grounds} /> : null}

      <Section title={`All tournaments · ${tournaments.length}`}>
        {tournaments.length === 0 ? (
          <EmptyState
            icon="🏆"
            title="No tournaments yet"
            description={
              admin
                ? "Add a tournament to track its entry fee against match expenses."
                : "No tournaments have been added yet."
            }
          />
        ) : (
          <div className="space-y-3">
            {tournaments.map((t) => {
              const progress =
                t.totalFee > 0 ? Math.min((t.feePaid / t.totalFee) * 100, 100) : 100;
              return (
                <div key={t.id} className="card overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-[17px] font-semibold tracking-[-0.01em]">
                          {t.name}
                        </h3>
                        <p className="mt-0.5 text-[13px] text-label-secondary">
                          {t.overs} overs ·{" "}
                          {t.totalMatches
                            ? `${t.matchCount} of ${t.totalMatches} matches recorded`
                            : `${t.matchCount} match${t.matchCount === 1 ? "" : "es"}`}
                        </p>
                        {t.grounds.length > 0 ? (
                          <p className="mt-1 flex flex-wrap gap-1">
                            {t.grounds.map((g) => (
                              <span
                                key={g.id}
                                className="badge bg-ios-green/10 text-[#248A3D]"
                              >
                                🏟 {g.name}
                              </span>
                            ))}
                          </p>
                        ) : null}
                      </div>
                      {admin ? (
                        <EditTournamentPanel
                          tournament={{
                            id: t.id,
                            name: t.name,
                            overs: t.overs,
                            totalFee: t.totalFee,
                            totalMatches: t.totalMatches,
                            groundIds: t.grounds.map((g) => g.id),
                          }}
                          matchCount={t.matchCount}
                          grounds={grounds}
                        />
                      ) : null}
                    </div>

                    {/* Formula 4 */}
                    <div className="mt-3.5">
                      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
                        <span className="text-label-secondary">
                          {formatMoney(t.feePaid)} paid of {formatMoney(t.totalFee)}
                        </span>
                        <span
                          className={`font-semibold ${
                            t.outstanding > 0 ? "text-ios-orange" : "text-ios-green"
                          }`}
                        >
                          {t.outstanding > 0
                            ? `${formatMoney(t.outstanding)} outstanding`
                            : "Fully paid"}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-black/[0.06]">
                        <div
                          className={`h-full rounded-full transition-all ${
                            t.outstanding > 0 ? "bg-ios-orange" : "bg-ios-green"
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <dl className="mt-3.5 grid grid-cols-3 gap-2 border-t border-separator/70 pt-3">
                      <div>
                        <dt className="text-[11px] font-medium uppercase tracking-wide text-label-secondary">
                          Collected
                        </dt>
                        <dd className="text-[15px] font-semibold">
                          <Money value={t.collection} />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-medium uppercase tracking-wide text-label-secondary">
                          Expenses
                        </dt>
                        <dd className="text-[15px] font-semibold">
                          <Money value={t.expenses} />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-medium uppercase tracking-wide text-label-secondary">
                          Net
                        </dt>
                        <dd className="text-[15px] font-semibold">
                          <Money value={t.net} tone="ledger" />
                        </dd>
                      </div>
                    </dl>

                    {t.matchCount > 0 ? (
                      <Link
                        href="/matches"
                        className="mt-3 inline-block text-[13px] font-medium text-ios-blue"
                      >
                        View matches
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}
