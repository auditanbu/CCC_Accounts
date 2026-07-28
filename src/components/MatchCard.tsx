import Link from "next/link";

import { Money } from "@/components/ui/Money";
import { ChevronRightIcon } from "@/components/ui/Icons";
import { TEAM_NAME } from "@/lib/constants";
import { formatDate, formatTime, relativeDay } from "@/lib/format";

export type MatchCardData = {
  id: number;
  date: Date;
  matchType: "TOURNAMENT" | "PRACTICE";
  matchNumber: number | null;
  overs: number;
  opponentTeam: string;
  ground: { name: string; location?: string | null };
  tournament: { name: string } | null;
  totals?: { collection: number; expenses: number; net: number; presentCount: number };
};

export function MatchTypeBadge({ type }: { type: "TOURNAMENT" | "PRACTICE" }) {
  return type === "TOURNAMENT" ? (
    <span className="badge bg-ios-indigo/10 text-ios-indigo">Tournament</span>
  ) : (
    <span className="badge bg-ios-teal/10 text-[#1F8A9E]">Practice</span>
  );
}

export function MatchCard({ match, showMoney = true }: { match: MatchCardData; showMoney?: boolean }) {
  const t = match.totals;
  const hasMoney = showMoney && t && (t.collection > 0 || t.expenses > 0);

  return (
    <Link
      href={`/matches/${match.id}`}
      className="card block p-4 transition-all duration-150 active:scale-[0.99] sm:hover:shadow-card-hover"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <MatchTypeBadge type={match.matchType} />
            {match.matchNumber ? (
              <span className="badge bg-black/[0.05] text-label-secondary">
                Match {match.matchNumber}
              </span>
            ) : null}
            <span className="badge bg-black/[0.05] text-label-secondary">{match.overs} ov</span>
          </div>

          <p className="truncate text-[16px] font-semibold tracking-[-0.01em]">
            {TEAM_NAME} <span className="text-label-tertiary">vs</span> {match.opponentTeam}
          </p>

          <p className="mt-1 truncate text-[13px] text-label-secondary">
            {formatDate(match.date)} · {formatTime(match.date)} · 🏟 {match.ground.name}
          </p>

          {match.tournament ? (
            <p className="mt-0.5 truncate text-[12px] text-ios-indigo">🏆 {match.tournament.name}</p>
          ) : null}
        </div>

        <ChevronRightIcon className="mt-1 shrink-0 text-label-tertiary" />
      </div>

      {hasMoney ? (
        <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-separator/70 pt-3">
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
      ) : null}

      {!hasMoney && t ? (
        <p className="mt-3 border-t border-separator/70 pt-3 text-[12px] text-label-secondary">
          {t.presentCount > 0
            ? `${t.presentCount} players marked · no accounts recorded yet`
            : `Scheduled ${relativeDay(match.date)} · no accounts yet`}
        </p>
      ) : null}
    </Link>
  );
}
