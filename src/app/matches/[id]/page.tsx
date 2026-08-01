import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ExpenseSection } from "@/app/matches/[id]/ExpenseSection";
import { RosterEditor, type RosterRow } from "@/app/matches/[id]/RosterEditor";
import { MatchTypeBadge, ResultBadge } from "@/components/MatchCard";
import { ShareButton } from "@/components/ShareButton";
import { EmptyState, Section } from "@/components/ui/Card";
import { ChevronLeftIcon, PencilIcon } from "@/components/ui/Icons";
import { Money } from "@/components/ui/Money";
import { TEAM_NAME } from "@/lib/constants";
import { avatarLabel, formatDateLong, formatMoney, formatTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  getLastPlayedRosterIds,
  getMatchDetail,
  getPlayerPendings,
  getTeamBalance,
} from "@/lib/queries";
import { isAdmin } from "@/lib/session";
import { buildWhatsAppSummary } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const match = await prisma.match.findUnique({
    where: { id: Number(id) },
    select: { opponentTeam: true },
  });
  return { title: match ? `vs ${match.opponentTeam}` : "Match" };
}

export default async function MatchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isInteger(matchId)) notFound();
  const { edit } = await searchParams;

  const detail = await getMatchDetail(matchId);
  if (!detail) notFound();

  const { match, totals } = detail;

  const [admin, teamBalance, playerPendings, activePlayers, lastMatchPlayerIds] =
    await Promise.all([
      isAdmin(),
      getTeamBalance(),
      getPlayerPendings(),
      prisma.player.findMany({
        where: { status: "ACTIVE" },
        orderBy: { jerseyNumber: "asc" },
      }),
      getLastPlayedRosterIds(matchId),
    ]);

  // Roster candidates: everyone currently active, plus anyone already on this
  // match sheet (so a since-retired player's record stays editable).
  const existingById = new Map(match.players.map((mp) => [mp.playerId, mp]));
  const candidates = [
    ...activePlayers,
    ...match.players.filter((mp) => mp.player.status !== "ACTIVE").map((mp) => mp.player),
  ];
  const seen = new Set<number>();
  const rosterRows: RosterRow[] = candidates
    .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
    .sort((a, b) => (a.jerseyNumber ?? Infinity) - (b.jerseyNumber ?? Infinity))
    .map((p) => {
      const mp = existingById.get(p.id);
      return {
        playerId: p.id,
        name: p.name,
        jerseyNumber: p.jerseyNumber,
        defaultMatchFee: p.defaultMatchFee,
        isPresent: mp?.isPresent ?? false,
        payableAmount: mp?.payableAmount ?? p.defaultMatchFee,
        collectedAmount: mp?.collectedAmount ?? 0,
        paymentMode: mp?.paymentMode ?? null,
      };
    });

  const present = match.players.filter((mp) => mp.isPresent);

  const whatsappText = buildWhatsAppSummary({
    opponentTeam: match.opponentTeam,
    date: match.date,
    groundName: match.ground.name,
    matchCollection: totals.collection,
    matchExpenses: totals.expenses,
    netAmount: totals.net,
    teamBalance,
    pendings: playerPendings.map((p) => ({ name: p.name, pending: p.pending })),
  });

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <Link
          href="/matches"
          className="mb-2 inline-flex items-center gap-1 text-[14px] font-medium text-ios-blue"
        >
          <ChevronLeftIcon width={16} height={16} />
          Matches
        </Link>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <MatchTypeBadge type={match.matchType} />
              {match.matchNumber ? (
                <span className="badge bg-black/[0.05] text-label-secondary">
                  Match {match.matchNumber}
                </span>
              ) : null}
              <span className="badge bg-black/[0.05] text-label-secondary">
                {match.overs} overs
              </span>
            </div>
            <h1 className="page-title">
              {TEAM_NAME} <span className="text-label-tertiary">vs</span> {match.opponentTeam}
            </h1>
            <p className="mt-1.5 text-[14px] text-label-secondary">
              {formatDateLong(match.date)} · {formatTime(match.date)}
            </p>
            <p className="text-[14px] text-label-secondary">
              🏟 {match.ground.name}
              {match.ground.location ? `, ${match.ground.location}` : ""}
              {match.ground.googleMapUrl ? (
                <>
                  {" · "}
                  <a
                    href={match.ground.googleMapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-ios-blue"
                  >
                    Directions
                  </a>
                </>
              ) : null}
            </p>
            {match.tournament ? (
              <p className="mt-0.5 text-[14px] text-ios-indigo">🏆 {match.tournament.name}</p>
            ) : null}
            {match.tossWonBy ? (
              <p className="mt-2 text-[13px] text-label-secondary">
                🪙 {match.tossWonBy === "US" ? TEAM_NAME : match.opponentTeam} won the toss
                {match.tossDecision
                  ? `, chose to ${match.tossDecision === "BAT" ? "bat" : "bowl"}`
                  : ""}
              </p>
            ) : null}
            {match.result ? (
              <p className="mt-2 flex flex-wrap items-center gap-2 text-[14px]">
                <ResultBadge result={match.result} />
                {match.ourScore || match.opponentScore ? (
                  <span className="text-label-secondary">
                    {TEAM_NAME} {match.ourScore ?? "—"} · {match.opponentTeam}{" "}
                    {match.opponentScore ?? "—"}
                  </span>
                ) : null}
              </p>
            ) : null}
            {match.cricheroesUrl ? (
              <a
                href={match.cricheroesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-[13px] font-medium text-ios-blue"
              >
                View full scorecard on Cricheroes ↗
              </a>
            ) : null}
          </div>

          {admin ? (
            <Link href={`/matches/${match.id}/edit`} className="btn-secondary btn-sm shrink-0">
              <PencilIcon width={15} height={15} />
              Edit
            </Link>
          ) : null}
        </div>

        {match.notes ? (
          <p className="mt-3 rounded-xl bg-black/[0.035] px-3.5 py-2.5 text-[13px] leading-relaxed text-label-secondary">
            {match.notes}
          </p>
        ) : null}
      </div>

      {/* Match accounts — formula 3 */}
      <Section title="Match accounts">
        <div className="card overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-separator/70 border-b border-separator/70">
            <div className="px-4 py-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-label-secondary">
                Total collection
              </p>
              <p className="mt-1 text-[20px] font-bold">
                <Money value={totals.collection} />
              </p>
              <p className="mt-0.5 text-[12px] text-label-secondary">
                from {totals.presentCount} player{totals.presentCount === 1 ? "" : "s"}
              </p>
            </div>
            <div className="px-4 py-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-label-secondary">
                Total expenses
              </p>
              <p className="mt-1 text-[20px] font-bold">
                <Money value={totals.expenses} />
              </p>
              <p className="mt-0.5 text-[12px] text-label-secondary">
                {match.expenses.length} item{match.expenses.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div className="flex items-baseline justify-between gap-3 px-4 py-3.5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-label-secondary">
                Net match balance
              </p>
              <p className="mt-0.5 text-[12px] text-label-secondary">Collection − expenses</p>
            </div>
            <p className="text-[26px] font-bold tracking-[-0.02em]">
              <Money value={totals.net} tone="ledger" />
            </p>
          </div>

          {totals.pending > 0 ? (
            <div className="flex items-center justify-between gap-3 border-t border-separator/70 bg-ios-orange/[0.06] px-4 py-3">
              <p className="text-[13px] font-medium text-ios-orange">
                Still to collect for this match
              </p>
              <p className="tnum text-[15px] font-bold text-ios-orange">
                {formatMoney(totals.pending)}
              </p>
            </div>
          ) : null}
        </div>
      </Section>

      {/* Roster */}
      <Section title={admin ? "Roster & collections" : `Playing XI · ${present.length}`}>
        {admin ? (
          rosterRows.length === 0 ? (
            <EmptyState
              icon="👥"
              title="No active players"
              description="Add players to the squad before recording a roster."
              action={
                <Link href="/players" className="btn-tinted btn-sm">
                  Manage squad
                </Link>
              }
            />
          ) : (
            <RosterEditor
              matchId={match.id}
              rows={rosterRows}
              lastMatchPlayerIds={lastMatchPlayerIds}
              forceEdit={edit === "1"}
            />
          )
        ) : present.length === 0 ? (
          <EmptyState
            icon="👥"
            title="Roster not published"
            description="The playing XI hasn't been recorded for this match yet."
          />
        ) : (
          <ul className="list-group">
            {[...present]
              .sort((a, b) => a.player.name.localeCompare(b.player.name))
              .map((mp) => {
              const due = mp.payableAmount - mp.collectedAmount;
              return (
                <li key={mp.id} className="list-row">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ios-blue/12 text-[13px] font-semibold text-ios-blue">
                    {avatarLabel(mp.player.name, mp.player.jerseyNumber)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">
                      {mp.player.name}
                    </span>
                    <span className="block text-[12px] text-label-secondary">
                      {mp.player.jerseyNumber !== null ? `#${mp.player.jerseyNumber}` : ""}
                      {mp.paymentMode
                        ? `${mp.player.jerseyNumber !== null ? " · " : ""}paid by ${mp.paymentMode === "UPI" ? "UPI" : "cash"}`
                        : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="tnum block text-[14px] font-semibold">
                      {formatMoney(mp.collectedAmount)}
                      <span className="font-normal text-label-tertiary">
                        {" "}
                        / {formatMoney(mp.payableAmount)}
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
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {/* Expenses */}
      <Section title={`Expenses · ${formatMoney(totals.expenses)}`}>
        <ExpenseSection matchId={match.id} expenses={match.expenses} admin={admin} />
      </Section>

      {/* WhatsApp export */}
      {admin ? (
        <Section title="Share">
          <div className="card-pad">
            <ShareButton text={whatsappText} />
          </div>
        </Section>
      ) : null}
    </div>
  );
}
