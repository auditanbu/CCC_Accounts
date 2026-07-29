"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { idleState, type ActionState } from "@/app/actions/types";
import { Field, FormMessage, SubmitButton } from "@/components/ui/Form";
import { NewTournamentButton } from "@/components/TournamentForms";
import { OVERS_OPTIONS } from "@/lib/constants";
import {
  formatDateValueLong,
  isSundayValue,
  toDateInputValue,
  toTimeInputValue,
  upcomingSundays,
} from "@/lib/format";

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
  // Local copy so a tournament created from inside this form appears in the
  // list straight away, without re-fetching and losing the entered values.
  const [options, setOptions] = useState<Option[]>(tournaments);

  const initialDate = initial ? toDateInputValue(initial.date) : null;
  // The list is fixed for the life of the form so the selected option can't
  // shift underneath the captain while they fill the rest of it in.
  const [sundays] = useState<string[]>(() => {
    const list = upcomingSundays(SUNDAYS_SUGGESTED);
    // An existing Sunday fixture may sit outside the window (a past match being
    // corrected); keep it selectable rather than forcing the custom picker.
    return initialDate && isSundayValue(initialDate) && !list.includes(initialDate)
      ? [initialDate, ...list]
      : list;
  });
  const [date, setDate] = useState<string>(initialDate ?? sundays[0] ?? "");
  // Practice games are occasionally midweek, so Sundays are a suggestion, not a rule.
  const [customDate, setCustomDate] = useState<boolean>(
    initialDate !== null && !sundays.includes(initialDate),
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

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Date"
            htmlFor="date"
            error={err.date}
            hint={customDate ? undefined : "Match days — Sundays."}
          >
            {customDate ? (
              <>
                <input
                  id="date"
                  name="date"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCustomDate(false);
                    if (!sundays.includes(date)) setDate(sundays[0] ?? "");
                  }}
                  className="mt-1.5 text-[12px] font-medium text-ios-blue active:opacity-60"
                >
                  Back to Sundays
                </button>
              </>
            ) : (
              <select
                id="date"
                name="date"
                required
                value={date}
                onChange={(e) => {
                  if (e.target.value === OTHER_DATE) {
                    setCustomDate(true);
                    return;
                  }
                  setDate(e.target.value);
                }}
                className="select"
              >
                {sundays.map((value) => (
                  <option key={value} value={value}>
                    {formatDateValueLong(value)}
                  </option>
                ))}
                <option value={OTHER_DATE}>Another date…</option>
              </select>
            )}
          </Field>

          <Field label="Start time" htmlFor="time" error={err.time}>
            <input
              id="time"
              name="time"
              type="time"
              required
              defaultValue={initial ? toTimeInputValue(initial.date) : DEFAULT_START_TIME}
              className="input"
            />
          </Field>
        </div>

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
              options.length === 0
                ? "None yet — tap New to create one without leaving this page."
                : "Overs default to the tournament's format."
            }
          >
            <div className="flex gap-2">
              <select
                id="tournamentId"
                name="tournamentId"
                value={tournamentId}
                onChange={(e) => {
                  setTournamentId(e.target.value);
                  const picked = options.find((t) => String(t.id) === e.target.value);
                  if (picked?.overs) setOvers(picked.overs);
                }}
                className="select flex-1"
              >
                <option value="">Select a tournament</option>
                {options.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.overs ? ` (${t.overs} ov)` : ""}
                  </option>
                ))}
              </select>

              <NewTournamentButton
                grounds={grounds.map((g) => ({
                  id: g.id,
                  name: g.name,
                  location: g.location ?? null,
                }))}
                onCreated={(t) => {
                  // Add it locally and select it, so the half-filled match
                  // form survives — a page refresh here would discard it.
                  setOptions((prev) => [...prev, t].sort((a, b) => a.name.localeCompare(b.name)));
                  setTournamentId(String(t.id));
                  if (t.overs) setOvers(t.overs);
                }}
              />
            </div>
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

/** Roughly four months of fixtures — far enough ahead to plan a tournament. */
const SUNDAYS_SUGGESTED = 16;
/** Sentinel for the escape hatch out of the Sunday list. */
const OTHER_DATE = "__other__";
/** The usual start time for a weekend game. */
const DEFAULT_START_TIME = "08:00";
