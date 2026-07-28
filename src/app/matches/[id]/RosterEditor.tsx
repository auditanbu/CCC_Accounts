"use client";

import { useActionState, useMemo, useState } from "react";

import { saveRosterAction } from "@/app/actions/matches";
import { idleState } from "@/app/actions/types";
import { FormMessage, SubmitButton } from "@/components/ui/Form";
import { formatMoney, initials, round2 } from "@/lib/format";

export type RosterRow = {
  playerId: number;
  name: string;
  jerseyNumber: number;
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

export function RosterEditor({ matchId, rows }: { matchId: number; rows: RosterRow[] }) {
  const [state, action] = useActionState(saveRosterAction, idleState);
  const [drafts, setDrafts] = useState<Record<number, Draft>>(() =>
    Object.fromEntries(rows.map((r) => [r.playerId, toDraft(r)])),
  );

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

  function setAll(present: boolean) {
    setDrafts((prev) =>
      Object.fromEntries(
        rows.map((r) => [
          r.playerId,
          present
            ? { ...prev[r.playerId]!, present: true, payable: String(r.defaultMatchFee) }
            : { present: false, payable: "", collected: "", mode: "" as const },
        ]),
      ),
    );
  }

  /** Fill every present player's collected amount with what they owe. */
  function collectAll(mode: "UPI" | "CASH") {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const r of rows) {
        const d = next[r.playerId]!;
        if (!d.present) continue;
        const payable = d.payable === "" ? r.defaultMatchFee : num(d.payable);
        next[r.playerId] = { ...d, collected: String(payable), mode: payable > 0 ? mode : "" };
      }
      return next;
    });
  }

  const totals = useMemo(() => {
    let payable = 0;
    let collected = 0;
    let playing = 0;
    for (const r of rows) {
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
  }, [drafts, rows]);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="matchId" value={matchId} />

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setAll(true)} className="btn-secondary btn-sm">
          Select all
        </button>
        <button type="button" onClick={() => setAll(false)} className="btn-secondary btn-sm">
          Clear all
        </button>
        <span className="mx-1 hidden w-px self-stretch bg-separator sm:block" />
        <button type="button" onClick={() => collectAll("UPI")} className="btn-tinted btn-sm">
          All paid · UPI
        </button>
        <button type="button" onClick={() => collectAll("CASH")} className="btn-tinted btn-sm">
          All paid · Cash
        </button>
      </div>

      <ul className="list-group">
        {rows.map((row) => {
          const d = drafts[row.playerId]!;
          const payableNum = d.payable === "" ? row.defaultMatchFee : num(d.payable);
          const short = round2(payableNum - num(d.collected));

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
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-semibold transition-colors ${
                    d.present ? "bg-ios-blue/12 text-ios-blue" : "bg-black/[0.05] text-label-tertiary"
                  }`}
                  aria-hidden
                >
                  {initials(row.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-[15px] font-medium ${
                      d.present ? "" : "text-label-secondary"
                    }`}
                  >
                    {row.name}
                  </span>
                  <span className="block text-[12px] text-label-secondary">
                    #{row.jerseyNumber} · default {formatMoney(row.defaultMatchFee)}
                  </span>
                </span>
                {d.present && short > 0 ? (
                  <span className="badge shrink-0 bg-ios-orange/12 text-ios-orange">
                    {formatMoney(short)} due
                  </span>
                ) : null}
                {d.present && short <= 0 && num(d.collected) > 0 ? (
                  <span className="badge shrink-0 bg-ios-green/12 text-[#248A3D]">Paid</span>
                ) : null}
              </label>

              {d.present ? (
                <div className="mt-3 grid grid-cols-2 gap-2 pl-[34px] sm:grid-cols-3">
                  <div>
                    <span className="mb-1 block text-[11px] font-medium text-label-secondary">
                      Payable ₹
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="1"
                      name={`payable-${row.playerId}`}
                      value={d.payable}
                      onChange={(e) => update(row.playerId, { payable: e.target.value })}
                      className="input px-2.5 py-1.5 text-[14px]"
                    />
                  </div>
                  <div>
                    <span className="mb-1 block text-[11px] font-medium text-label-secondary">
                      Collected ₹
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="1"
                      placeholder="0"
                      name={`collected-${row.playerId}`}
                      value={d.collected}
                      onChange={(e) => update(row.playerId, { collected: e.target.value })}
                      className="input px-2.5 py-1.5 text-[14px]"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="mb-1 block text-[11px] font-medium text-label-secondary">
                      Mode
                    </span>
                    <select
                      name={`mode-${row.playerId}`}
                      value={d.mode}
                      onChange={(e) =>
                        update(row.playerId, { mode: e.target.value as Draft["mode"] })
                      }
                      className="select px-2.5 py-1.5 text-[14px]"
                    >
                      <option value="">Not recorded</option>
                      <option value="UPI">UPI</option>
                      <option value="CASH">Cash</option>
                    </select>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

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
