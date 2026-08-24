"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ChevronRightIcon } from "@/components/ui/Icons";
import { Money } from "@/components/ui/Money";
import { avatarLabel, formatMoney } from "@/lib/format";
import type { PlayerPending } from "@/lib/queries";

type SortKey = "name" | "balance" | "jersey";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "balance", label: "Balance" },
  { key: "jersey", label: "Jersey" },
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
          {avatarLabel(p.name, p.jerseyNumber)}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-medium">{p.name}</span>
            {p.status === "INACTIVE" ? (
              <span className="badge bg-black/[0.05] text-label-tertiary">Inactive</span>
            ) : null}
          </span>
          <span className="block text-[12px] text-label-secondary">
            {p.jerseyNumber !== null ? `#${p.jerseyNumber} · ` : ""}
            {p.matchesPlayed} match{p.matchesPlayed === 1 ? "" : "es"} ·{" "}
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
  const [sort, setSort] = useState<SortKey>("name");
  // Balance's own direction, independent of which sort is currently active —
  // remembered across clicks so re-picking Balance resumes where it left off.
  const [balanceDesc, setBalanceDesc] = useState(true);

  function pick(key: SortKey) {
    if (key === "balance" && sort === "balance") {
      // Clicking Balance again flips direction instead of doing nothing.
      setBalanceDesc((v) => !v);
      return;
    }
    setSort(key);
  }

  const sorted = useMemo(() => {
    const comparator: (a: PlayerPending, b: PlayerPending) => number =
      sort === "name"
        ? (a, b) => a.name.localeCompare(b.name)
        : sort === "jersey"
          ? (a, b) => (a.jerseyNumber ?? Infinity) - (b.jerseyNumber ?? Infinity)
          : // Highest amount owed first by default, then flips to highest
            // credit first — click Balance again to toggle.
            (a, b) => (balanceDesc ? b.pending - a.pending : a.pending - b.pending);
    return [...players].sort(comparator);
  }, [players, sort, balanceDesc]);

  return (
    <div className="space-y-2">
      <div role="group" aria-label="Sort active squad by" className="flex flex-wrap gap-1.5">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            aria-pressed={sort === opt.key}
            onClick={() => pick(opt.key)}
            className={`btn btn-sm ${sort === opt.key ? "bg-ios-blue text-white" : "bg-black/[0.05] text-label"}`}
          >
            {opt.key === "balance" ? `Balance ${sort === "balance" && !balanceDesc ? "↑" : "↓"}` : opt.label}
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
