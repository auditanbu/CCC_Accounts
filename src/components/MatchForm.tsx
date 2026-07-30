"use client";

import Link from "next/link";
import { Fragment, useActionState, useState, type ReactNode } from "react";

import { idleState, type ActionState } from "@/app/actions/types";
import { Field, FormMessage, SubmitButton } from "@/components/ui/Form";
import { NewTournamentButton } from "@/components/TournamentForms";
import { OVERS_OPTIONS, TEAM_NAME } from "@/lib/constants";
import {
  formatDateValueLong,
  isSundayValue,
  surroundingSundays,
  toDateInputValue,
  toTimeInputValue,
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
  tossWonBy: "US" | "OPPONENT" | null;
  tossDecision: "BAT" | "BOWL" | null;
  result: "WIN" | "LOSS" | "TIE" | "NO_RESULT" | null;
  ourScore: string | null;
  opponentScore: string | null;
  cricheroesUrl: string | null;
  notes: string | null;
};

export function MatchForm({
  action,
  grounds,
  tournaments,
  opponentSuggestions = [],
  initial,
  submitLabel,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  grounds: GroundOption[];
  tournaments: TournamentOption[];
  /** Previously entered opponent names, for the field's autocomplete. */
  opponentSuggestions?: string[];
  initial?: MatchFormValues;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, idleState);
  // Most fixtures are tournament games, so a brand-new match starts there —
  // an edit still shows whatever the match was actually saved as.
  const [matchType, setMatchType] = useState<"TOURNAMENT" | "PRACTICE">(
    initial?.matchType ?? "TOURNAMENT",
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
    const list = surroundingSundays(PAST_SUNDAYS, FUTURE_SUNDAYS);
    // An existing Sunday fixture may sit outside the window (an old match being
    // corrected); keep it selectable rather than forcing the custom picker.
    // ISO date strings sort chronologically, so a plain sort re-inserts it in place.
    return initialDate && isSundayValue(initialDate) && !list.includes(initialDate)
      ? [...list, initialDate].sort()
      : list;
  });
  // Most fixtures get entered after they're played, so default to the most
  // recently completed Sunday rather than the next one coming up.
  const [date, setDate] = useState<string>(initialDate ?? lastPastOrToday(sundays));
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
          list="opponent-suggestions"
          autoComplete="off"
          className="input"
        />
        {/* A native datalist, not a custom dropdown — suggests without
            forcing a choice, and needs no client-side filtering logic. */}
        <datalist id="opponent-suggestions">
          {opponentSuggestions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
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
            {(["TOURNAMENT", "PRACTICE"] as const).map((type) => (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={matchType === type}
                onClick={() => setMatchType(type)}
                className={`flex-1 rounded-[9px] py-2 text-[14px] font-semibold transition-all ${
                  matchType === type
                    ? "bg-surface text-label shadow-sm"
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

      <div className="card-pad space-y-4">
        <p className="section-title">Result</p>
        <p className="-mt-2 text-[12px] text-label-secondary">
          Fill this in once the match has been played. Optional.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Toss won by" htmlFor="tossWonBy" error={err.tossWonBy}>
            <select
              id="tossWonBy"
              name="tossWonBy"
              defaultValue={initial?.tossWonBy ?? ""}
              className="select"
            >
              <option value="">Not recorded</option>
              <option value="US">{TEAM_NAME}</option>
              <option value="OPPONENT">Opponent</option>
            </select>
          </Field>
          <Field label="Elected to" htmlFor="tossDecision" error={err.tossDecision}>
            <select
              id="tossDecision"
              name="tossDecision"
              defaultValue={initial?.tossDecision ?? ""}
              className="select"
            >
              <option value="">—</option>
              <option value="BAT">Bat</option>
              <option value="BOWL">Bowl</option>
            </select>
          </Field>
        </div>

        <Field label="Result" htmlFor="result" error={err.result}>
          <select
            id="result"
            name="result"
            defaultValue={initial?.result ?? ""}
            className="select"
          >
            <option value="">Not played yet</option>
            <option value="WIN">Win</option>
            <option value="LOSS">Loss</option>
            <option value="TIE">Tie</option>
            <option value="NO_RESULT">No result</option>
          </select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Our score" htmlFor="ourScore" error={err.ourScore}>
            <input
              id="ourScore"
              name="ourScore"
              type="text"
              maxLength={40}
              placeholder="e.g. 156/7 (20)"
              defaultValue={initial?.ourScore ?? ""}
              className="input"
            />
          </Field>
          <Field label="Opponent score" htmlFor="opponentScore" error={err.opponentScore}>
            <input
              id="opponentScore"
              name="opponentScore"
              type="text"
              maxLength={40}
              placeholder="e.g. 148/9 (20)"
              defaultValue={initial?.opponentScore ?? ""}
              className="input"
            />
          </Field>
        </div>

        <Field
          label="Cricheroes link"
          htmlFor="cricheroesUrl"
          error={err.cricheroesUrl}
          hint="Full scorecard, for anyone who wants the ball-by-ball detail."
        >
          <input
            id="cricheroesUrl"
            name="cricheroesUrl"
            type="url"
            maxLength={300}
            placeholder="https://cricheroes.com/scorecard/…"
            defaultValue={initial?.cricheroesUrl ?? ""}
            className="input"
          />
        </Field>
      </div>

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

/** Roughly two months back — far enough to log a recent fixture late. */
const PAST_SUNDAYS = 8;
/** Roughly four months ahead — far enough to plan a tournament. */
const FUTURE_SUNDAYS = 16;
/** Sentinel for the escape hatch out of the Sunday list. */
const OTHER_DATE = "__other__";
/** The usual start time for a weekend game. */
const DEFAULT_START_TIME = "08:00";

/** The most recent Sunday at or before today, from a chronological list. */
function lastPastOrToday(sundays: string[]): string {
  const today = toDateInputValue(new Date());
  return sundays.reduce((latest, value) => (value <= today ? value : latest), sundays[0] ?? "");
}
