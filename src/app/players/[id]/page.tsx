import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deletePlayerAction, togglePlayerStatusAction } from "@/app/actions/players";
import { EditPlayerForm } from "@/components/PlayerForm";
import { UpiPayButton } from "@/components/UpiPayButton";
import { EmptyState, Section } from "@/components/ui/Card";
import { ConfirmSubmit, SubmitButton } from "@/components/ui/Form";
import { ChevronLeftIcon, TrashIcon } from "@/components/ui/Icons";
import { Money, StatCard } from "@/components/ui/Money";
import { avatarLabel, formatDate, formatMoney } from "@/lib/format";
import { getPlayerLedger } from "@/lib/queries";
import { isAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const player = await prisma.player.findUnique({
    where: { id: Number(id) },
    select: { name: true },
  });
  return { title: player?.name ?? "Player" };
}

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const playerId = Number(id);
  if (!Number.isInteger(playerId)) notFound();

  const [ledger, admin] = await Promise.all([getPlayerLedger(playerId), isAdmin()]);
  if (!ledger) notFound();

  const { player, rows, totalPayable, totalCollected, openingBalance, pending, matchesPlayed } =
    ledger;
  const appearances = rows.filter((r) => r.isPresent);

  return (
    <div className="space-y-7">
      <div>
        <Link
          href="/players"
          className="mb-2 inline-flex items-center gap-1 text-[14px] font-medium text-ios-blue"
        >
          <ChevronLeftIcon width={16} height={16} />
          Players
        </Link>

        <div className="flex items-center gap-3.5">
          <span
            className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-[22px] font-bold ${
              player.status === "ACTIVE"
                ? "bg-gradient-to-br from-ios-blue to-ios-indigo text-white shadow-card"
                : "bg-black/[0.05] text-label-tertiary"
            }`}
          >
            {avatarLabel(player.name, player.jerseyNumber)}
          </span>
          <div className="min-w-0">
            <h1 className="page-title truncate">{player.name}</h1>
            <p className="mt-0.5 text-[14px] text-label-secondary">
              {player.jerseyNumber !== null ? `Jersey #${player.jerseyNumber} · ` : ""}
              {formatMoney(player.defaultMatchFee)} per match
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span
                className={`badge ${
                  player.status === "ACTIVE"
                    ? "bg-ios-green/12 text-[#248A3D]"
                    : "bg-black/[0.05] text-label-tertiary"
                }`}
              >
                {player.status === "ACTIVE" ? "Active" : "Inactive"}
              </span>
              {player.mobileNumber ? (
                <a
                  href={`tel:${player.mobileNumber.replace(/\s/g, "")}`}
                  className="badge bg-ios-blue/10 text-ios-blue"
                >
                  📞 {player.mobileNumber}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Formula 1, spelled out */}
      <div className="card overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-separator/70 border-b border-separator/70">
          <div className="px-4 py-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-label-secondary">
              Total payable
            </p>
            <p className="mt-1 text-[20px] font-bold">
              <Money value={totalPayable} />
            </p>
          </div>
          <div className="px-4 py-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-label-secondary">
              Total paid
            </p>
            <p className="mt-1 text-[20px] font-bold">
              <Money value={totalCollected} />
            </p>
          </div>
        </div>
        {admin && openingBalance !== 0 ? (
          <div className="flex items-baseline justify-between gap-3 border-b border-separator/70 px-4 py-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-label-secondary">
                Opening balance
              </p>
              <p className="mt-0.5 text-[12px] text-label-secondary">
                Brought forward from the old ledger
              </p>
            </div>
            <p className="text-[16px] font-semibold">
              {openingBalance < 0 ? (
                <Money value={-openingBalance} tone="positive" />
              ) : (
                <Money value={openingBalance} tone="negative" />
              )}
            </p>
          </div>
        ) : null}

        <div className="flex items-baseline justify-between gap-3 px-4 py-3.5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-label-secondary">
              {pending < 0 ? "Credit balance" : "Outstanding"}
            </p>
            <p className="mt-0.5 text-[12px] text-label-secondary">
              {admin && openingBalance !== 0 ? "Opening + payable − paid" : "Payable − paid"} across{" "}
              {matchesPlayed} match{matchesPlayed === 1 ? "" : "es"}
            </p>
          </div>
          <p className="text-[26px] font-bold tracking-[-0.02em]">
            {pending < 0 ? (
              <Money value={-pending} tone="positive" />
            ) : (
              <Money value={pending} tone={pending > 0 ? "negative" : "plain"} />
            )}
          </p>
        </div>

        {pending > 0 ? (
          <div className="border-t border-separator/70 px-4 py-3.5">
            <UpiPayButton note="ESK - team amount" amount={pending} />
          </div>
        ) : null}
      </div>

      <Section title={`Match history · ${appearances.length}`}>
        {appearances.length === 0 ? (
          <EmptyState icon="🏏" title="No appearances yet" />
        ) : (
          <ul className="list-group">
            {appearances.map((r) => {
              const due = r.payableAmount - r.collectedAmount;
              return (
                <li key={r.id}>
                  <Link href={`/matches/${r.matchId}`} className="list-row-link">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">
                        vs {r.match.opponentTeam}
                      </span>
                      <span className="block truncate text-[12px] text-label-secondary">
                        {formatDate(r.match.date)} · {r.match.ground.name}
                        {r.paymentMode ? ` · ${r.paymentMode}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="tnum block text-[14px] font-semibold">
                        {formatMoney(r.collectedAmount)}
                        <span className="font-normal text-label-tertiary">
                          {" "}
                          / {formatMoney(r.payableAmount)}
                        </span>
                      </span>
                      {due > 0 ? (
                        <span className="text-[12px] font-medium text-ios-orange">
                          {formatMoney(due)} due
                        </span>
                      ) : (
                        <span className="text-[12px] font-medium text-ios-green">Settled</span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {admin ? (
        <>
          <Section title="Manage">
            <EditPlayerForm
              player={{
                id: player.id,
                name: player.name,
                jerseyNumber: player.jerseyNumber,
                mobileNumber: player.mobileNumber,
                status: player.status,
                defaultMatchFee: player.defaultMatchFee,
                openingBalance: player.openingBalance,
              }}
            />
          </Section>

          <div className="card-pad space-y-3">
            <form action={togglePlayerStatusAction}>
              <input type="hidden" name="id" value={player.id} />
              <SubmitButton className="btn-secondary w-full sm:w-auto">
                {player.status === "ACTIVE" ? "Mark inactive" : "Mark active"}
              </SubmitButton>
            </form>

            <div className="border-t border-separator/70 pt-3">
              <p className="text-[15px] font-semibold">Remove player</p>
              <p className="mb-3 mt-1 text-[13px] leading-relaxed text-label-secondary">
                {rows.length > 0
                  ? "This player has match history, so they'll be marked inactive instead of deleted — their past accounts stay intact."
                  : "This player has no match history and will be deleted permanently."}
              </p>
              <form action={deletePlayerAction}>
                <input type="hidden" name="id" value={player.id} />
                <ConfirmSubmit
                  message={
                    rows.length > 0
                      ? `Retire ${player.name}? Their match history will be kept.`
                      : `Delete ${player.name} permanently?`
                  }
                  className="btn-destructive w-full sm:w-auto"
                >
                  <TrashIcon width={16} height={16} />
                  {rows.length > 0 ? "Retire player" : "Delete player"}
                </ConfirmSubmit>
              </form>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
