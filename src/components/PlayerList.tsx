"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ChevronRightIcon } from "@/components/ui/Icons";
import { Money } from "@/components/ui/Money";
import { formatMoney } from "@/lib/format";
import type { PlayerPending } from "@/lib/queries";

type SortKey = "jersey" | "name" | "balance";

const SORTERS: Record<SortKey, (a: PlayerPending, b: PlayerPending) => number> = {
  jersey: (a, b) => a.jerseyNumber - b.jerseyNumber,
  name: (a, b) => a.name.localeCompare(b.name),
  // Highest amount owed first, so the players who most need chasing surface
  // at the top — matches the sort the home page's pendings list already uses.
  balance: (a, b) => b.pending - a.pending,
};

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "jersey", label: "Jersey" },
  { key: "name", label: "Name" },
  { key: "balance", label: "Balance" },
];

function PlayerRow({ p }: { p: PlayerPending }) {
  const settled = p.pending <= 0;
  return (
    <li>
      <Link href={`/players/${p.id}`} className="list-row-link">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-[14px] font-semibold ${
            p.status === "INACTIVE"
              ? "bg-black/[0.05] text-label-tertiary"
              : settled
                ? "bg-ios-green/12 text-[#248A3D]"
                : "bg-ios-orange/12 text-ios-orange"
          }`}
        >
          {p.jerseyNumber}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-medium">{p.name}</span>
            {p.status === "INACTIVE" ? (
              <span className="badge bg-black/[0.05] text-label-tertiary">Inactive</span>
            ) : null}
          </span>
          <span className="block text-[12px] text-label-secondary">
            #{p.jerseyNumber} · {p.matchesPlayed} match{p.matchesPlayed === 1 ? "" : "es"} ·{" "}
            {formatMoney(p.defaultMatchFee)}/match
          </span>
        </span>

        <span className="shrink-0 text-right">
          {settled ? (
            <span className="text-[13px] font-medium text-ios-green">
              {p.pending < 0 ? `${formatMoney(-p.pending)} credit` : "Settled"}
            </span>
          ) : (
            <>
              <span className="block text-[15px] font-semibold">
                <Money value={p.pending} tone="negative" />
              </span>
              <span className="block text-[11px] text-label-secondary">pending</span>
            </>
          )}
        </span>

        <ChevronRightIcon className="shrink-0 text-label-tertiary" />
      </Link>
    </li>
  );
}

/** The active squad list, with a sort control — inactive players don't get
 * one since that list is short and always jersey-ordered. */
export function ActiveSquadList({ players }: { players: PlayerPending[] }) {
  const [sort, setSort] = useState<SortKey>("jersey");

  const sorted = useMemo(
    () => [...players].sort(SORTERS[sort]),
    [players, sort],
  );

  return (
    <div className="space-y-2">
      <div role="group" aria-label="Sort active squad by" className="flex flex-wrap gap-1.5">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            aria-pressed={sort === opt.key}
            onClick={() => setSort(opt.key)}
            className={`btn btn-sm ${sort === opt.key ? "bg-ios-blue text-white" : "bg-black/[0.05] text-label"}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <ul className="list-group">
        {sorted.map((p) => (
          <PlayerRow key={p.id} p={p} />
        ))}
      </ul>
    </div>
  );
}

export { PlayerRow };
