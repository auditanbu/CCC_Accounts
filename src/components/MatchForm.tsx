"use client";

import Link from "next/link";
import { Fragment, useActionState, useState, type ReactNode } from "react";

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

type GroundOption = { id: number; name: string; location?: string | null };
type TournamentOption = {
  id: number;
  name: string;
  overs?: number;
  /** Venues the tournament is played at — the ground list is narrowed to these. */
  groundIds: number[];
};

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
  grounds: GroundOption[];
  tournaments: TournamentOption[];
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
  const [groundId, setGroundId] = useState<string>(
    initial?.groundId ? String(initial.groundId) : "",
  );
  // Local copy so a tournament created from inside this form appears in the
  // list straight away, without re-fetching and losing the entered values.
  const [options, setOptions] = useState<TournamentOption[]>(tournaments);

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

  const tournament = options.find((t) => String(t.id) === tournamentId) ?? null;
  const tournamentGrounds = tournament
    ? grounds.filter((g) => tournament.groundIds.includes(g.id))
    : [];
  // A tournament saved without venues shouldn't dead-end the form, so fall back
  // to every ground rather than offering an empty list.
  const narrowed = !isTournament
    ? grounds
    : tournament === null
      ? []
      : tournamentGrounds.length > 0
        ? tournamentGrounds
        : grounds;
  // An existing match may sit at a ground since dropped from its tournament.
  // Without this the select would render blank while still holding — and
  // submitting — the saved id.
  const groundChoices =
    groundId && !narrowed.some((g) => String(g.id) === groundId)
      ? [...narrowed, ...grounds.filter((g) => String(g.id) === groundId)]
      : narrowed;

  /** Clears a ground the newly picked tournament isn't played at. */
  function keepGroundIfPlayedThere(groundIds: number[]) {
    if (groundIds.length > 0 && groundId && !groundIds.includes(Number(groundId))) {
      setGroundId("");
    }
  }

  const groundHint = isTournament
    ? tournament === null
      ? "Pick the tournament first — its venues load here."
      : tournamentGrounds.length === 0
        ? "No venues saved on this tournament — showing every ground."
        : "Venues this tournament is played at."
    : grounds.length === 0
      ? "No grounds yet — add one first."
      : undefined;

  /*
   * Every field is keyed and rendered from a single parent, so switching match
   * type reorders the DOM nodes instead of recreating them — anything already
   * typed into an uncontrolled input survives the switch.
   */
  const fields: Record<string, ReactNode> = {
    tournament: (
      <Field
        label="Tournament"
        htmlFor="tournamentId"
        error={err.tournamentId}
        hint={
          options.length === 0
            ? "None yet — tap New to create one without leaving this page."
            : undefined
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
              // Overs follow the tournament's format but stay editable — a
              // semi-final is occasionally played over a different number.
              if (picked?.overs) setOvers(picked.overs);
              if (picked) keepGroundIfPlayedThere(picked.groundIds);
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
              const created: TournamentOption = { ...t, groundIds: t.groundIds ?? [] };
              setOptions((prev) =>
                [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
              );
              setTournamentId(String(created.id));
              if (created.overs) setOvers(created.overs);
              keepGroundIfPlayedThere(created.groundIds);
            }}
          />
        </div>
      </Field>
    ),

    ground: (
      <Field label="Ground" htmlFor="groundId" error={err.groundId} hint={groundHint}>
        <select
          id="groundId"
          name="groundId"
          required
          value={groundId}
          onChange={(e) => setGroundId(e.target.value)}
          disabled={isTournament && tournament === null}
          className="select"
        >
          <option value="" disabled>
            {isTournament && tournament === null
              ? "Select a tournament first"
              : "Select a ground"}
          </option>
          {groundChoices.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
              {g.location ? ` — ${g.location}` : ""}
            </option>
          ))}
        </select>
      </Field>
    ),

    overs: (
      <Field
        label="Overs"
        htmlFor="overs"
        error={err.overs}
        hint={
          isTournament && tournament
            ? "Set from the tournament's format — change it if this fixture differs."
            : undefined
        }
      >
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
    ),

    matchNumber: (
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
    ),

    dateTime: (
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
    ),

    opponent: (
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
    ),
  };

  // A tournament fixture is entered top-down: which tournament, where it is
  // played, over how many overs, which fixture — then when and against whom.
  const order = isTournament
    ? ["tournament", "ground", "overs", "matchNumber", "dateTime", "opponent"]
    : ["dateTime", "opponent", "ground", "overs"];

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

        {order.map((key) => (
          <Fragment key={key}>{fields[key]}</Fragment>
        ))}
      </div>

      {/* Keep the keys present so the server always sees the fields. */}
      {isTournament ? null : (
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
