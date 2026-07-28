"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { idleState, type ActionState } from "@/app/actions/types";
import { Field, FormMessage, SubmitButton } from "@/components/ui/Form";
import { OVERS_OPTIONS } from "@/lib/constants";
import { istParts, toDateTimeLocalValue } from "@/lib/format";

type Option = { id: number; name: string; location?: string | null; overs?: number };

export type MatchFormValues = {
  id?: number;
  date: Date;
  matchType: "TOURNAMENT" | "PRACTICE";
  matchNumber: number | null;
  overs: number;
  opponentTeam: string;
  groundId: number;
  tournamentId: number | null;
  notes: string | null;
};

export function MatchForm({
  action,
  grounds,
  tournaments,
  initial,
  submitLabel,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  grounds: Option[];
  tournaments: Option[];
  initial?: MatchFormValues;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, idleState);
  const [matchType, setMatchType] = useState<"TOURNAMENT" | "PRACTICE">(
    initial?.matchType ?? "PRACTICE",
  );
  const [overs, setOvers] = useState<number>(initial?.overs ?? 20);
  const [tournamentId, setTournamentId] = useState<string>(
    initial?.tournamentId ? String(initial.tournamentId) : "",
  );

  const err = state.fieldErrors ?? {};
  const isTournament = matchType === "TOURNAMENT";

  return (
    <form action={formAction} className="space-y-5">
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}

      <div className="card-pad space-y-4">
        {/* Segmented control — the iOS way to pick between two modes. */}
        <div>
          <span className="label">Match type</span>
          <div
            role="radiogroup"
            aria-label="Match type"
            className="flex gap-1 rounded-xl bg-black/[0.05] p-1"
          >
            {(["PRACTICE", "TOURNAMENT"] as const).map((type) => (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={matchType === type}
                onClick={() => setMatchType(type)}
                className={`flex-1 rounded-[9px] py-2 text-[14px] font-semibold transition-all ${
                  matchType === type
                    ? "bg-white text-label shadow-sm"
                    : "text-label-secondary active:opacity-60"
                }`}
              >
                {type === "PRACTICE" ? "Practice" : "Tournament"}
              </button>
            ))}
          </div>
          <input type="hidden" name="matchType" value={matchType} />
        </div>

        <Field label="Date & time" htmlFor="date" error={err.date}>
          <input
            id="date"
            name="date"
            type="datetime-local"
            required
            defaultValue={
              initial ? toDateTimeLocalValue(initial.date) : defaultDateTimeValue()
            }
            className="input"
          />
        </Field>

        <Field label="Opponent team" htmlFor="opponentTeam" error={err.opponentTeam}>
          <input
            id="opponentTeam"
            name="opponentTeam"
            type="text"
            required
            maxLength={80}
            placeholder="e.g. Royal Strikers"
            defaultValue={initial?.opponentTeam ?? ""}
            className="input"
          />
        </Field>

        <Field
          label="Ground"
          htmlFor="groundId"
          error={err.groundId}
          hint={grounds.length === 0 ? "No grounds yet — add one first." : undefined}
        >
          <select
            id="groundId"
            name="groundId"
            required
            defaultValue={initial?.groundId ? String(initial.groundId) : ""}
            className="select"
          >
            <option value="" disabled>
              Select a ground
            </option>
            {grounds.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
                {g.location ? ` — ${g.location}` : ""}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Overs" htmlFor="overs" error={err.overs}>
          <select
            id="overs"
            name="overs"
            value={String(overs)}
            onChange={(e) => setOvers(Number(e.target.value))}
            className="select"
          >
            {OVERS_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o} overs
              </option>
            ))}
          </select>
        </Field>
      </div>

      {isTournament ? (
        <div className="card-pad animate-fade-in-up space-y-4">
          <p className="section-title">Tournament details</p>

          <Field
            label="Tournament"
            htmlFor="tournamentId"
            error={err.tournamentId}
            hint={
              tournaments.length === 0
                ? "No tournaments yet — add one from the Cups tab."
                : "Overs default to the tournament's format."
            }
          >
            <select
              id="tournamentId"
              name="tournamentId"
              value={tournamentId}
              onChange={(e) => {
                setTournamentId(e.target.value);
                const picked = tournaments.find((t) => String(t.id) === e.target.value);
                if (picked?.overs) setOvers(picked.overs);
              }}
              className="select"
            >
              <option value="">Select a tournament</option>
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.overs ? ` (${t.overs} ov)` : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Match number"
            htmlFor="matchNumber"
            error={err.matchNumber}
            hint="Which fixture in the tournament this is. Optional."
          >
            <input
              id="matchNumber"
              name="matchNumber"
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="e.g. 3"
              defaultValue={initial?.matchNumber ?? ""}
              className="input"
            />
          </Field>
        </div>
      ) : (
        // Keep the keys present so the server always sees the fields.
        <>
          <input type="hidden" name="tournamentId" value="" />
          <input type="hidden" name="matchNumber" value="" />
        </>
      )}

      <div className="card-pad">
        <Field label="Notes" htmlFor="notes" error={err.notes} hint="Optional.">
          <textarea
            id="notes"
            name="notes"
            rows={3}
            maxLength={500}
            placeholder="Toss, result, anything worth remembering…"
            defaultValue={initial?.notes ?? ""}
            className="input resize-y"
          />
        </Field>
      </div>

      <FormMessage state={state} />

      <div className="flex gap-2">
        <SubmitButton className="btn-primary flex-1">{submitLabel}</SubmitButton>
        <Link
          href={initial?.id ? `/matches/${initial.id}` : "/matches"}
          className="btn-secondary"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

/** Today at 8:00 AM IST — the usual start time for weekend games. */
function defaultDateTimeValue(): string {
  const p = istParts(new Date());
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T08:00`;
}
