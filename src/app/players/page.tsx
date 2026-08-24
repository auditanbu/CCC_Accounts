import type { Metadata } from "next";

import { AddPlayerForm } from "@/components/PlayerForm";
import { ActiveSquadList, PlayerRow } from "@/components/PlayerList";
import { EmptyState, Section } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/Money";
import { getPlayerPendings } from "@/lib/queries";
import { isAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Players" };

export default async function PlayersPage() {
  const [players, admin] = await Promise.all([getPlayerPendings(), isAdmin()]);

  const active = players.filter((p) => p.status === "ACTIVE");
  const inactive = players.filter((p) => p.status === "INACTIVE");
  const totalPending = players.reduce((s, p) => s + Math.max(p.pending, 0), 0);
  // The flip side of pending — players who've paid in more than they owe.
  const totalExcess = players.reduce((s, p) => s + Math.max(-p.pending, 0), 0);

  const takenJerseys = players.map((p) => p.jerseyNumber).filter((n): n is number => n !== null);
  const nextJersey = takenJerseys.length > 0 ? Math.max(...takenJerseys) + 1 : 1;

  return (
    <div className="space-y-7">
      <div>
        <h1 className="page-title">Players</h1>
        <p className="mt-1 text-[14px] text-label-secondary">
          {active.length} active · {inactive.length} inactive
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Excess" value={totalExcess} accent="bg-ios-green" />
        <StatCard
          label="Pending"
          value={totalPending}
          tone={totalPending > 0 ? "negative" : "plain"}
          accent="bg-ios-orange"
        />
      </div>

      {admin ? <AddPlayerForm suggestedJersey={nextJersey} /> : null}

      <Section title={`Active squad · ${active.length}`}>
        {active.length === 0 ? (
          <EmptyState
            icon="👤"
            title="No active players"
            description={admin ? "Add your first player above." : "The squad hasn't been set up yet."}
          />
        ) : (
          <ActiveSquadList players={active} />
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
