import type { Metadata } from "next";
import Link from "next/link";

import { AddPlayerForm } from "@/components/PlayerForm";
import { EmptyState, Section } from "@/components/ui/Card";
import { ChevronRightIcon } from "@/components/ui/Icons";
import { Money, StatCard } from "@/components/ui/Money";
import { formatMoney } from "@/lib/format";
import { getPlayerPendings } from "@/lib/queries";
import { isAdmin } from "@/lib/session";
import type { PlayerPending } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Players" };

const SORT_OPTIONS = [
  { key: "balance", label: "Balance" },
  { key: "name", label: "Name" },
] as const;
type SortKey = (typeof SORT_OPTIONS)[number]["key"];

/** Highest pending balance first, or alphabetical — balance surfaces who to chase. */
function sortPlayers(list: PlayerPending[], sort: SortKey): PlayerPending[] {
  const sorted = [...list];
  if (sort === "name") {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    sorted.sort((a, b) => b.pending - a.pending);
  }
  return sorted;
}

function SortToggle({ sort }: { sort: SortKey }) {
  return (
    <div className="inline-flex rounded-lg bg-black/[0.05] p-0.5">
      {SORT_OPTIONS.map((opt) => (
        <Link
          key={opt.key}
          href={opt.key === "balance" ? "/players" : `/players?sort=${opt.key}`}
          className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
            sort === opt.key ? "bg-ios-blue/10 text-ios-blue" : "text-label-secondary"
          }`}
        >
          {opt.label}
        </Link>
      ))}
    </div>
  );
}

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

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort: sortParam } = await searchParams;
  const sort: SortKey = sortParam === "name" ? "name" : "balance";

  const [players, admin] = await Promise.all([getPlayerPendings(), isAdmin()]);

  const active = sortPlayers(players.filter((p) => p.status === "ACTIVE"), sort);
  const inactive = sortPlayers(players.filter((p) => p.status === "INACTIVE"), sort);
  const totalPending = players.reduce((s, p) => s + Math.max(p.pending, 0), 0);
  const totalCollected = players.reduce((s, p) => s + p.totalCollected, 0);
  const owing = players.filter((p) => p.pending > 0).length;

  const nextJersey =
    players.length > 0 ? Math.max(...players.map((p) => p.jerseyNumber)) + 1 : 1;

  return (
    <div className="space-y-7">
      <div>
        <h1 className="page-title">Players</h1>
        <p className="mt-1 text-[14px] text-label-secondary">
          {active.length} active · {inactive.length} inactive
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Collected" value={totalCollected} accent="bg-ios-green" />
        <StatCard
          label="Pending"
          value={totalPending}
          tone={totalPending > 0 ? "negative" : "plain"}
          accent="bg-ios-orange"
        />
        <StatCard
          label="Owe money"
          value={`${owing}`}
          caption={`of ${players.length} players`}
          accent="bg-ios-blue"
        />
      </div>

      {admin ? <AddPlayerForm suggestedJersey={nextJersey} /> : null}

      <Section title={`Active squad · ${active.length}`} action={<SortToggle sort={sort} />}>
        {active.length === 0 ? (
          <EmptyState
            icon="👤"
            title="No active players"
            description={admin ? "Add your first player above." : "The squad hasn't been set up yet."}
          />
        ) : (
          <ul className="list-group">
            {active.map((p) => (
              <PlayerRow key={p.id} p={p} />
            ))}
          </ul>
        )}
      </Section>

      {inactive.length > 0 ? (
        <Section title={`Inactive · ${inactive.length}`}>
          <ul className="list-group">
            {inactive.map((p) => (
              <PlayerRow key={p.id} p={p} />
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}
