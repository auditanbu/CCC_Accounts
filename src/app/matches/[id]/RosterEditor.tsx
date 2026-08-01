"use client";

import { useActionState, useMemo, useState } from "react";

import { saveRosterAction } from "@/app/actions/matches";
import { idleState } from "@/app/actions/types";
import { NewPlayerButton } from "@/components/PlayerForm";
import { FormMessage, SubmitButton } from "@/components/ui/Form";
import { PencilIcon } from "@/components/ui/Icons";
import { avatarLabel, formatMoney, round2 } from "@/lib/format";

export type RosterRow = {
  playerId: number;
  name: string;
  jerseyNumber: number | null;
  defaultMatchFee: number;
  isPresent: boolean;
  payableAmount: number;
  collectedAmount: number;
  paymentMode: "UPI" | "CASH" | null;
};

type Draft = {
  present: boolean;
  payable: string;
  collected: string;
  mode: "" | "UPI" | "CASH";
};

function toDraft(row: RosterRow): Draft {
  return {
    present: row.isPresent,
    payable: row.isPresent ? String(row.payableAmount) : "",
    collected: row.collectedAmount ? String(row.collectedAmount) : "",
    mode: row.paymentMode ?? "",
  };
}

const num = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const byName = (a: RosterRow, b: RosterRow) => a.name.localeCompare(b.name);

function Avatar({
  name,
  jerseyNumber,
  active,
}: {
  name: string;
  jerseyNumber: number | null;
  active: boolean;
}) {
  return (
    <span
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-semibold transition-colors ${
        active ? "bg-ios-blue/12 text-ios-blue" : "bg-black/[0.05] text-label-tertiary"
      }`}
      aria-hidden
    >
      {avatarLabel(name, jerseyNumber)}
    </span>
  );
}

export function RosterEditor({
  matchId,
  rows,
  lastMatchPlayerIds = [],
  forceEdit = false,
}: {
  matchId: number;
  rows: RosterRow[];
  /** Players who turned out in the previous match — pinned to the top when selecting. */
  lastMatchPlayerIds?: number[];
  /** Opens straight into edit mode — used right after creating a new match. */
  forceEdit?: boolean;
}) {
  const [state, action] = useActionState(saveRosterAction, idleState);
  const [editing, setEditing] = useState(forceEdit);
  // Local copy so a player added inline (without leaving the page) shows up
  // as a candidate immediately.
  const [allRows, setAllRows] = useState<RosterRow[]>(rows);
  const [drafts, setDrafts] = useState<Record<number, Draft>>(() =>
    Object.fromEntries(rows.map((r) => [r.playerId, toDraft(r)])),
  );
  // Marking who played is the common, fast action; collections are a
  // separate step tucked behind this so the checklist isn't cluttered by
  // default.
  const [showCollections, setShowCollections] = useState(false);

  function update(playerId: number, patch: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [playerId]: { ...prev[playerId]!, ...patch } }));
  }

  /**
   * Ticking a player in pulls their profile fee across automatically; ticking
   * out clears the money so an absentee never carries a balance.
   */
  function togglePresent(row: RosterRow, present: boolean) {
    update(
      row.playerId,
      present
        ? { present: true, payable: String(row.defaultMatchFee) }
        : { present: false, payable: "", collected: "", mode: "" },
    );
  }

  /** UPI <-> Cash only — "not recorded" is implied whenever nothing's collected. */
  function toggleMode(playerId: number) {
    setDrafts((prev) => {
      const d = prev[playerId]!;
      return { ...prev, [playerId]: { ...d, mode: d.mode === "CASH" ? "UPI" : "CASH" } };
    });
  }

  function handleNewPlayer(p: {
    id: number;
    name: string;
    jerseyNumber: number | null;
    defaultMatchFee: number;
  }) {
    setAllRows((prev) => [
      ...prev,
      {
        playerId: p.id,
        name: p.name,
        jerseyNumber: p.jerseyNumber,
        defaultMatchFee: p.defaultMatchFee,
        isPresent: false,
        payableAmount: p.defaultMatchFee,
        collectedAmount: 0,
        paymentMode: null,
      },
    ]);
    // Adding them here means putting them on this match sheet — check them
    // in straight away instead of making that a second step.
    setDrafts((prev) => ({
      ...prev,
      [p.id]: { present: true, payable: String(p.defaultMatchFee), collected: "", mode: "" },
    }));
  }

  const totals = useMemo(() => {
    let payable = 0;
    let collected = 0;
    let playing = 0;
    for (const r of allRows) {
      const d = drafts[r.playerId]!;
      if (!d.present) continue;
      playing += 1;
      payable += d.payable === "" ? r.defaultMatchFee : num(d.payable);
      collected += num(d.collected);
    }
    return {
      payable: round2(payable),
      collected: round2(collected),
      pending: round2(payable - collected),
      playing,
    };
  }, [drafts, allRows]);

  // Attendance step: whoever played last time surfaces first, so re-picking
  // the same XI is fast; everyone else follows, alphabetically.
  const attendanceOrder = useMemo(() => {
    const lastSet = new Set(lastMatchPlayerIds);
    const last = allRows.filter((r) => lastSet.has(r.playerId)).sort(byName);
    const rest = allRows.filter((r) => !lastSet.has(r.playerId)).sort(byName);
    return [...last, ...rest];
  }, [allRows, lastMatchPlayerIds]);

  // Collections step: plain alphabetical — the "who played last" grouping
  // only helps while picking the XI, not while collecting money from it.
  const collectionsOrder = useMemo(() => [...allRows].sort(byName), [allRows]);

  const visibleRows = showCollections
    ? collectionsOrder.filter((row) => drafts[row.playerId]!.present)
    : attendanceOrder;

  const takenJerseys = allRows
    .map((r) => r.jerseyNumber)
    .filter((n): n is number => n !== null);
  const nextJersey = takenJerseys.length > 0 ? Math.max(...takenJerseys) + 1 : 1;

  if (!editing) {
    const present = [...rows].filter((r) => r.isPresent).sort(byName);
    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <button type="button" onClick={() => setEditing(true)} className="btn-secondary btn-sm">
            <PencilIcon width={15} height={15} />
            Edit roster
          </button>
        </div>

        {present.length === 0 ? (
          <p className="rounded-xl bg-black/[0.04] px-3.5 py-2.5 text-[13px] text-label-secondary">
            No players marked yet — tap Edit roster to select the XI.
          </p>
        ) : (
          <ul className="list-group">
            {present.map((row) => {
              const due = round2(row.payableAmount - row.collectedAmount);
              return (
                <li key={row.playerId} className="list-row">
                  <Avatar name={row.name} jerseyNumber={row.jerseyNumber} active />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{row.name}</span>
                    {row.jerseyNumber !== null ? (
                      <span className="block text-[12px] text-label-secondary">
                        #{row.jerseyNumber}
                      </span>
                    ) : null}
                  </span>
                  {due > 0 ? (
                    <span className="badge shrink-0 bg-ios-orange/12 text-ios-orange">
                      {formatMoney(due)} due
                    </span>
                  ) : row.collectedAmount > 0 ? (
                    <span className="badge shrink-0 bg-ios-green/12 text-[#248A3D]">Paid</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="matchId" value={matchId} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowCollections((v) => !v)}
            className="btn-tinted btn-sm"
          >
            {showCollections ? "Hide collections" : "Record collections"}
          </button>
          <NewPlayerButton onCreated={handleNewPlayer} suggestedJersey={nextJersey} />
        </div>
        <button type="button" onClick={() => setEditing(false)} className="btn-secondary btn-sm">
          Done
        </button>
      </div>

      {showCollections && visibleRows.length === 0 ? (
        <p className="rounded-xl bg-black/[0.04] px-3.5 py-2.5 text-[13px] text-label-secondary">
          No players marked present yet — hide collections and select the XI first.
        </p>
      ) : (
        <ul className="list-group">
          {visibleRows.map((row) => {
            const d = drafts[row.playerId]!;

            if (showCollections) {
              const pending = d.collected === "" || num(d.collected) <= 0;
              const modeLabel = pending ? "Pending" : d.mode === "CASH" ? "Cash" : "UPI";
              return (
                <li key={row.playerId} className="px-4 py-2.5">
                  <input type="hidden" name="player" value={row.playerId} />
                  <input type="hidden" name={`present-${row.playerId}`} value="on" />
                  <input type="hidden" name={`payable-${row.playerId}`} value={d.payable} />
                  <input type="hidden" name={`mode-${row.playerId}`} value={d.mode || "UPI"} />
                  <div className="flex items-center gap-2.5">
                    <Avatar name={row.name} jerseyNumber={row.jerseyNumber} active />
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                      {row.name}
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="1"
                      placeholder="0"
                      aria-label={`Collected from ${row.name}`}
                      value={d.collected}
                      onChange={(e) => {
                        const collected = e.target.value;
                        // Suggest UPI the moment an amount is entered, but only
                        // if no mode has been picked yet — don't clobber Cash.
                        const mode = d.mode === "" && num(collected) > 0 ? "UPI" : d.mode;
                        update(row.playerId, { collected, mode });
                      }}
                      className="input w-20 shrink-0 px-2 py-1.5 text-right text-[14px] tnum"
                    />
                    <button
                      type="button"
                      onClick={() => toggleMode(row.playerId)}
                      className={`btn btn-sm w-[70px] shrink-0 ${
                        pending
                          ? "bg-black/[0.05] text-label-tertiary"
                          : d.mode === "CASH"
                            ? "bg-ios-teal/12 text-ios-teal"
                            : "bg-ios-blue/12 text-ios-blue"
                      }`}
                    >
                      {modeLabel}
                    </button>
                  </div>
                </li>
              );
            }

            return (
              <li key={row.playerId} className="px-4 py-3">
                {/* Always post the id so the server sees absentees explicitly. */}
                <input type="hidden" name="player" value={row.playerId} />
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    name={`present-${row.playerId}`}
                    checked={d.present}
                    onChange={(e) => togglePresent(row, e.target.checked)}
                    className="h-[22px] w-[22px] shrink-0 cursor-pointer rounded-md border-black/15 text-ios-blue accent-ios-blue focus:ring-ios-blue"
                  />
                  <Avatar name={row.name} jerseyNumber={row.jerseyNumber} active={d.present} />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-[15px] font-medium ${
                        d.present ? "" : "text-label-secondary"
                      }`}
                    >
                      {row.name}
                    </span>
                    {row.jerseyNumber !== null ? (
                      <span className="block text-[12px] text-label-secondary">
                        #{row.jerseyNumber}
                      </span>
                    ) : null}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <div className="card grid grid-cols-3 divide-x divide-separator/70">
        <div className="px-2 py-3 text-center">
          <p className="text-[11px] font-semibold uppercase text-label-secondary">Playing</p>
          <p className="tnum mt-0.5 text-[16px] font-bold">{totals.playing}</p>
        </div>
        <div className="px-2 py-3 text-center">
          <p className="text-[11px] font-semibold uppercase text-label-secondary">Collected</p>
          <p className="tnum mt-0.5 text-[16px] font-bold">{formatMoney(totals.collected)}</p>
        </div>
        <div className="px-2 py-3 text-center">
          <p className="text-[11px] font-semibold uppercase text-label-secondary">Pending</p>
          <p
            className={`tnum mt-0.5 text-[16px] font-bold ${
              totals.pending > 0 ? "text-ios-orange" : "text-ios-green"
            }`}
          >
            {formatMoney(totals.pending)}
          </p>
        </div>
      </div>

      <FormMessage state={state} />

      <SubmitButton className="btn-primary w-full">Save roster & collections</SubmitButton>
    </form>
  );
}
