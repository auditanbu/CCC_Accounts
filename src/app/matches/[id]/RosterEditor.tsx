"use client";

import { Fragment, useActionState, useEffect, useMemo, useState } from "react";

import { saveRosterAction } from "@/app/actions/matches";
import { idleState } from "@/app/actions/types";
import { NewPlayerButton } from "@/components/PlayerForm";
import { FormMessage, SubmitButton } from "@/components/ui/Form";
import { PencilIcon } from "@/components/ui/Icons";
import { TEAM_NAME } from "@/lib/constants";
import { avatarLabel, formatDateSlash, formatMoney, round2 } from "@/lib/format";
import { buildUpiPayLink } from "@/lib/upi";

export type RosterRow = {
  playerId: number;
  name: string;
  jerseyNumber: number | null;
  defaultMatchFee: number;
  isPresent: boolean;
  payableAmount: number;
  collectedAmount: number;
  paymentMode: "UPI" | "CASH" | null;
  /** When this collection entry was last saved — the closest thing on file
   * to a "paid on" date. */
  collectedAt: string | null;
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

/** Present-or-settled status for a player, spelled out with the actual
 * amount rather than a bare "Paid" — and an explicit "₹0 due" for anyone
 * who owes nothing and has paid nothing (a zero-fee entry), instead of
 * showing no status at all. */
function StatusBadge({ payable, collected }: { payable: number; collected: number }) {
  const due = round2(payable - collected);
  if (due > 0) {
    return (
      <span className="badge shrink-0 bg-ios-orange/12 text-ios-orange">{formatMoney(due)} due</span>
    );
  }
  if (collected > 0) {
    return (
      <span className="badge shrink-0 bg-ios-green/12 text-[#248A3D]">{formatMoney(collected)} paid</span>
    );
  }
  return <span className="badge shrink-0 bg-ios-green/12 text-[#248A3D]">₹0 due</span>;
}

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

type Tab = "squad" | "collection";

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
  /** Opens straight into squad edit mode — used right after creating a new match. */
  forceEdit?: boolean;
}) {
  const [state, action] = useActionState(saveRosterAction, idleState);
  const [activeTab, setActiveTab] = useState<Tab>("squad");
  const [squadEditing, setSquadEditing] = useState(forceEdit);
  const [collectionEditing, setCollectionEditing] = useState(false);
  // Local copy so a player added inline (without leaving the page) shows up
  // as a candidate immediately.
  const [allRows, setAllRows] = useState<RosterRow[]>(rows);
  const [drafts, setDrafts] = useState<Record<number, Draft>>(() =>
    Object.fromEntries(rows.map((r) => [r.playerId, toDraft(r)])),
  );

  // Done (wherever it appears) and Save both submit the same form — once
  // that submission actually succeeds, drop back to view mode.
  useEffect(() => {
    if (state.ok) {
      setSquadEditing(false);
      setCollectionEditing(false);
    }
  }, [state]);

  function update(playerId: number, patch: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [playerId]: { ...prev[playerId]!, ...patch } }));
  }

  /**
   * Ticking a player in pulls their profile fee across automatically; ticking
   * out clears the money so an absentee never carries a balance. Ticking back
   * in restores whatever was already on file for this match — an accidental
   * uncheck-then-recheck shouldn't discard a real payment.
   */
  function togglePresent(row: RosterRow, present: boolean) {
    update(
      row.playerId,
      present
        ? {
            present: true,
            payable: String(row.defaultMatchFee),
            collected: row.collectedAmount ? String(row.collectedAmount) : "",
            mode: row.paymentMode ?? "",
          }
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
        collectedAt: null,
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

  // Squad step: whoever played last time surfaces first, so re-picking the
  // same XI is fast; everyone else follows, alphabetically.
  const attendanceOrder = useMemo(() => {
    const lastSet = new Set(lastMatchPlayerIds);
    const last = allRows.filter((r) => lastSet.has(r.playerId)).sort(byName);
    const rest = allRows.filter((r) => !lastSet.has(r.playerId)).sort(byName);
    return [...last, ...rest];
  }, [allRows, lastMatchPlayerIds]);

  // Collection step: plain alphabetical, present players only — the "who
  // played last" grouping only helps while picking the XI.
  const collectionOrder = useMemo(
    () => [...allRows].filter((r) => drafts[r.playerId]!.present).sort(byName),
    [allRows, drafts],
  );

  // What's actually saved right now — the two view-mode tabs read from this
  // (not from unsaved drafts), same as before.
  const present = useMemo(() => [...rows].filter((r) => r.isPresent).sort(byName), [rows]);

  const takenJerseys = allRows
    .map((r) => r.jerseyNumber)
    .filter((n): n is number => n !== null);
  const nextJersey = takenJerseys.length > 0 ? Math.max(...takenJerseys) + 1 : 1;

  const editingSomething = squadEditing || collectionEditing;

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="matchId" value={matchId} />

      {/*
        The complete, authoritative submission for every candidate — always
        rendered, regardless of which tab or step is currently on screen.
        Interactive controls below only ever call update() to change this
        state; they don't carry their own name attributes. That split is
        deliberate: it's what makes switching tabs (or saving from one
        without ever visiting the other) safe. Losing that guarantee once
        already silently zeroed out real collections — see git history.
      */}
      {allRows.map((row) => {
        const d = drafts[row.playerId]!;
        return (
          <Fragment key={row.playerId}>
            <input type="hidden" name="player" value={row.playerId} />
            <input type="hidden" name={`present-${row.playerId}`} value={d.present ? "on" : ""} />
            <input type="hidden" name={`payable-${row.playerId}`} value={d.payable} />
            <input type="hidden" name={`collected-${row.playerId}`} value={d.collected} />
            <input type="hidden" name={`mode-${row.playerId}`} value={d.mode || "UPI"} />
          </Fragment>
        );
      })}

      <div className="flex items-center gap-2">
        <div
          role="tablist"
          aria-label="Squad or collection"
          className="flex flex-1 gap-1 rounded-xl bg-black/[0.05] p-1"
        >
          {(["squad", "collection"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-[9px] py-2 text-[14px] font-semibold transition-all ${
                activeTab === tab
                  ? "bg-surface text-label shadow-sm"
                  : "text-label-secondary active:opacity-60"
              }`}
            >
              {tab === "squad" ? "Squad" : "Collection"}
            </button>
          ))}
        </div>

        {activeTab === "squad" ? (
          squadEditing ? (
            <SubmitButton className="btn-secondary btn-sm shrink-0" pendingLabel="Saving…">
              Done
            </SubmitButton>
          ) : (
            <button
              type="button"
              onClick={() => setSquadEditing(true)}
              className="btn-secondary btn-sm shrink-0"
            >
              <PencilIcon width={15} height={15} />
              Edit
            </button>
          )
        ) : collectionEditing ? (
          <SubmitButton className="btn-secondary btn-sm shrink-0" pendingLabel="Saving…">
            Done
          </SubmitButton>
        ) : (
          <button
            type="button"
            onClick={() => setCollectionEditing(true)}
            className="btn-secondary btn-sm shrink-0"
          >
            <PencilIcon width={15} height={15} />
            Edit
          </button>
        )}
      </div>

      {activeTab === "squad" ? (
        !squadEditing ? (
          <div className="space-y-3">
            {present.length === 0 ? (
              <p className="rounded-xl bg-black/[0.04] px-3.5 py-2.5 text-[13px] text-label-secondary">
                No players marked yet — tap Edit to select the XI.
              </p>
            ) : (
              <ul className="list-group">
                {present.map((row) => (
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
                    <StatusBadge payable={row.payableAmount} collected={row.collectedAmount} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <ul className="list-group">
              {attendanceOrder.map((row) => {
                const d = drafts[row.playerId]!;
                return (
                  <li key={row.playerId} className="px-4 py-3">
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
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
              <li className="px-4 py-3">
                <NewPlayerButton onCreated={handleNewPlayer} suggestedJersey={nextJersey} variant="row" />
              </li>
            </ul>
          </div>
        )
      ) : !collectionEditing ? (
        <div className="space-y-3">
          {present.length === 0 ? (
            <p className="rounded-xl bg-black/[0.04] px-3.5 py-2.5 text-[13px] text-label-secondary">
              No players marked yet — switch to Squad and select the XI first.
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
                      {row.paymentMode ? (
                        <span className="block text-[12px] text-label-secondary">
                          paid by {row.paymentMode === "UPI" ? "UPI" : "cash"}
                          {row.collectedAt ? ` on ${formatDateSlash(row.collectedAt)}` : ""}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="tnum block text-[14px] font-semibold">
                        {formatMoney(row.collectedAmount)}
                        <span className="font-normal text-label-tertiary">
                          {" "}
                          / {formatMoney(row.payableAmount)}
                        </span>
                      </span>
                      <StatusBadge payable={row.payableAmount} collected={row.collectedAmount} />
                      {due > 0 ? (
                        <a
                          href={buildUpiPayLink({
                            amount: due,
                            note: `${TEAM_NAME} dues - ${row.name}`,
                          })}
                          className="mt-1 block text-[12px] font-medium text-ios-blue"
                        >
                          Pay via UPI
                        </a>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {collectionOrder.length === 0 ? (
            <p className="rounded-xl bg-black/[0.04] px-3.5 py-2.5 text-[13px] text-label-secondary">
              No players marked present yet — switch to Squad and select the XI first.
            </p>
          ) : (
            <ul className="list-group">
              {collectionOrder.map((row) => {
                const d = drafts[row.playerId]!;
                const pending = d.collected === "" || num(d.collected) <= 0;
                const modeLabel = pending ? "Pending" : d.mode === "CASH" ? "Cash" : "UPI";
                return (
                  <li key={row.playerId} className="px-4 py-2.5">
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
              })}
            </ul>
          )}
        </div>
      )}

      {editingSomething ? (
        <>
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

          <SubmitButton className="btn-primary w-full">
            {activeTab === "collection" ? "Save collection" : "Save squad"}
          </SubmitButton>
        </>
      ) : null}
    </form>
  );
}
