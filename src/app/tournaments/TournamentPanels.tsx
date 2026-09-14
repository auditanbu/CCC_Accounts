"use client";

import Link from "next/link";
import { useState } from "react";

import { ResultBadge } from "@/components/MatchCard";
import { ChevronRightIcon } from "@/components/ui/Icons";
import { Money } from "@/components/ui/Money";
import { TEAM_NAME } from "@/lib/constants";
import { formatDateDotted, formatMoney } from "@/lib/format";
import type { TournamentMatchRow } from "@/lib/queries";

type Panel = "matches" | "fee";

/** "M1", or the date when the fixture was recorded without a number. */
function fixtureLabel(m: TournamentMatchRow): string {
  return m.matchNumber != null ? `M${m.matchNumber}` : formatDateDotted(m.date);
}

function Toggle({
  label,
  open,
  onClick,
}: {
  label: string;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className="inline-flex items-center gap-0.5 text-[13px] font-medium text-ios-blue"
    >
      {label}
      <ChevronRightIcon
        width={14}
        height={14}
        className={`shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
      />
    </button>
  );
}

/**
 * The two unfoldable summaries on a tournament card: fixture-by-fixture
 * results on the left, and the entry fee paid per fixture on the right.
 * Only one is open at a time — they cover the same list of matches, so
 * showing both at once just makes the card scroll.
 */
export function TournamentPanels({
  matches,
  totalFee,
  feePaid,
}: {
  matches: TournamentMatchRow[];
  totalFee: number;
  feePaid: number;
}) {
  const [panel, setPanel] = useState<Panel | null>(null);

  if (matches.length === 0) return null;

  function toggle(next: Panel) {
    setPanel((p) => (p === next ? null : next));
  }

  const outstanding = totalFee - feePaid;

  return (
    <div className="mt-3 border-t border-separator/70 pt-3">
      <div className="flex items-center justify-between gap-3">
        <Toggle label="View matches" open={panel === "matches"} onClick={() => toggle("matches")} />
        <Toggle
          label="View tournament fee"
          open={panel === "fee"}
          onClick={() => toggle("fee")}
        />
      </div>

      {panel === "matches" ? (
        <ul className="animate-fade-in-up mt-3 space-y-2">
          {matches.map((m) => (
            <li key={m.id}>
              <Link
                href={`/matches/${m.id}`}
                className="block rounded-xl bg-black/[0.03] p-2.5 transition-colors active:bg-black/[0.06]"
              >
                <div className="flex items-center gap-1.5">
                  <span className="badge bg-black/[0.06] text-label-secondary">
                    {fixtureLabel(m)}
                  </span>
                  {m.result ? <ResultBadge result={m.result} /> : null}
                  <span className="ml-auto truncate text-[13px] text-label-secondary">
                    vs {m.opponentTeam}
                  </span>
                </div>
                {m.ourScore || m.opponentScore ? (
                  <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[13px]">
                    <span className="font-semibold tnum">{TEAM_NAME} {m.ourScore ?? "—"}</span>
                    <span className="text-label-tertiary">vs</span>
                    <span className="tnum text-label-secondary">
                      {m.opponentTeam} {m.opponentScore ?? "—"}
                    </span>
                  </div>
                ) : (
                  <p className="mt-1.5 text-[13px] text-label-tertiary">Scores not recorded yet</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {panel === "fee" ? (
        <div className="animate-fade-in-up mt-3">
          <ul className="space-y-1.5">
            {matches.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-black/[0.03] px-2.5 py-2"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="badge shrink-0 bg-black/[0.06] text-label-secondary">
                    {fixtureLabel(m)}
                  </span>
                  <span className="truncate text-[13px] text-label-secondary">
                    vs {m.opponentTeam}
                  </span>
                </span>
                {m.feePaid > 0 ? (
                  <span className="tnum shrink-0 text-[14px] font-semibold">
                    <Money value={m.feePaid} />
                  </span>
                ) : (
                  <span className="shrink-0 text-[13px] text-label-tertiary">Not paid</span>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-separator/70 pt-2.5 text-[13px]">
            <span className="text-label-secondary">
              Paid of {formatMoney(totalFee)}
            </span>
            <span className={`font-semibold ${outstanding > 0 ? "text-ios-orange" : "text-ios-green"}`}>
              {outstanding > 0 ? `${formatMoney(outstanding)} outstanding` : "Fully paid"}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
