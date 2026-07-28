"use client";

import { useActionState, useEffect, useRef, useState } from "react";


import {
  createTournamentAction,
  deleteTournamentAction,
  updateTournamentAction,
} from "@/app/actions/tournaments";
import { idleState } from "@/app/actions/types";
import { ConfirmSubmit, Field, FormMessage, SubmitButton } from "@/components/ui/Form";
import { Sheet } from "@/components/ui/Sheet";
import { PencilIcon, PlusIcon, TrashIcon } from "@/components/ui/Icons";
import { OVERS_OPTIONS } from "@/lib/constants";

export type TournamentValues = {
  id: number;
  name: string;
  overs: number;
  totalFee: number;
  totalMatches: number | null;
  groundIds: number[];
};

export type GroundOption = { id: number; name: string; location: string | null };

function Fields({
  initial,
  fieldErrors,
  grounds,
}: {
  initial?: TournamentValues;
  fieldErrors: Record<string, string>;
  grounds: GroundOption[];
}) {
  const key = initial?.id ?? "new";
  const selected = new Set(initial?.groundIds ?? []);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field
        label="Name"
        htmlFor={`t-name-${initial?.id ?? "new"}`}
        error={fieldErrors.name}
        className="sm:col-span-3"
      >
        <input
          id={`t-name-${initial?.id ?? "new"}`}
          name="name"
          type="text"
          required
          maxLength={100}
          placeholder="e.g. Summer Cup 2026"
          defaultValue={initial?.name ?? ""}
          className="input"
        />
      </Field>

      <Field label="Format" htmlFor={`t-overs-${initial?.id ?? "new"}`} error={fieldErrors.overs}>
        <select
          id={`t-overs-${initial?.id ?? "new"}`}
          name="overs"
          defaultValue={String(initial?.overs ?? 20)}
          className="select"
        >
          {OVERS_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o} overs
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Number of matches"
        htmlFor={`t-count-${key}`}
        error={fieldErrors.totalMatches}
        hint="Optional."
      >
        <input
          id={`t-count-${key}`}
          name="totalMatches"
          type="number"
          inputMode="numeric"
          min={1}
          max={200}
          placeholder="e.g. 6"
          defaultValue={initial?.totalMatches ?? ""}
          className="input"
        />
      </Field>

      <Field
        label="Total entry fee ₹"
        htmlFor={`t-fee-${key}`}
        error={fieldErrors.totalFee}
      >
        <input
          id={`t-fee-${key}`}
          name="totalFee"
          type="number"
          inputMode="decimal"
          min={0}
          step="1"
          placeholder="0"
          defaultValue={initial?.totalFee ?? ""}
          className="input"
        />
      </Field>

      <div className="sm:col-span-3">
        <span className="label">Grounds</span>
        {grounds.length === 0 ? (
          <p className="rounded-xl bg-black/[0.04] px-3.5 py-2.5 text-[13px] text-label-secondary">
            No grounds yet — add one from the Grounds page, then edit this tournament.
          </p>
        ) : (
          // Checkboxes rather than a multi-select: a native multi-select needs
          // ctrl-clicking and is close to unusable on a phone.
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl bg-black/[0.03] p-1.5">
            {grounds.map((g) => (
              <label
                key={g.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors active:bg-black/[0.04] sm:hover:bg-black/[0.03]"
              >
                <input
                  type="checkbox"
                  name="groundIds"
                  value={g.id}
                  defaultChecked={selected.has(g.id)}
                  className="h-[20px] w-[20px] shrink-0 cursor-pointer rounded-md border-black/15 accent-ios-blue"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">{g.name}</span>
                  {g.location ? (
                    <span className="block truncate text-[12px] text-label-secondary">
                      {g.location}
                    </span>
                  ) : null}
                </span>
              </label>
            ))}
          </div>
        )}
        <p className="mt-1.5 text-[12px] text-label-secondary">
          Tick every venue this tournament is played at. Optional.
        </p>
      </div>
    </div>
  );
}

export function AddTournamentForm({ grounds }: { grounds: GroundOption[] }) {
  const [state, action] = useActionState(createTournamentAction, idleState);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-primary w-full sm:w-auto">
        <PlusIcon width={18} height={18} strokeWidth={2.2} />
        Add tournament
      </button>
    );
  }

  return (
    <form ref={formRef} action={action} className="card-pad animate-fade-in-up space-y-4">
      <p className="section-title">New tournament</p>
      <Fields fieldErrors={state.fieldErrors ?? {}} grounds={grounds} />
      <FormMessage state={state} />
      <div className="flex gap-2">
        <SubmitButton className="btn-primary flex-1">Add tournament</SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
          Close
        </button>
      </div>
    </form>
  );
}

/**
 * Creates a tournament from inside another form — the match form, where
 * needing one is discovered mid-flow. Reports the new record back so the
 * caller can select it immediately, rather than sending the admin to another
 * page and losing what they had typed.
 */
export function NewTournamentButton({
  onCreated,
  grounds,
}: {
  onCreated: (tournament: { id: number; name: string; overs?: number }) => void;
  grounds: GroundOption[];
}) {
  const [state, action] = useActionState(createTournamentAction, idleState);
  const [open, setOpen] = useState(false);
  const handled = useRef<number | null>(null);

  useEffect(() => {
    if (state.ok && state.created && handled.current !== state.created.id) {
      handled.current = state.created.id;
      onCreated(state.created);
      setOpen(false);
    }
  }, [state, onCreated]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-tinted btn-sm shrink-0"
      >
        <PlusIcon width={15} height={15} strokeWidth={2.2} />
        New
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="New tournament">
        {/*
          A nested <form> is invalid HTML, so this sheet is rendered by the
          caller outside its own form element — see MatchForm.
        */}
        <form action={action} className="card-pad space-y-4">
          <Fields fieldErrors={state.fieldErrors ?? {}} grounds={grounds} />
          <FormMessage state={state} />
          <SubmitButton className="btn-primary w-full">Create tournament</SubmitButton>
        </form>
      </Sheet>
    </>
  );
}

export function EditTournamentPanel({
  tournament,
  matchCount,
  grounds,
}: {
  tournament: TournamentValues;
  matchCount: number;
  grounds: GroundOption[];
}) {
  const [state, action] = useActionState(updateTournamentAction, idleState);
  const [deleteState, deleteAction] = useActionState(deleteTournamentAction, idleState);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-sm px-2 text-label-tertiary hover:text-ios-blue"
        aria-label={`Edit ${tournament.name}`}
      >
        <PencilIcon width={17} height={17} />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Edit tournament">
        <div className="space-y-4">
          <form action={action} className="card-pad space-y-4">
            <input type="hidden" name="id" value={tournament.id} />
            <Fields initial={tournament} fieldErrors={state.fieldErrors ?? {}} grounds={grounds} />
            <FormMessage state={state} />
            <SubmitButton className="btn-primary w-full">Save changes</SubmitButton>
          </form>

          <form action={deleteAction} className="card-pad">
            <p className="text-[15px] font-semibold">Delete tournament</p>
            <p className="mb-3 mt-1 text-[13px] text-label-secondary">
              {matchCount > 0
                ? `${matchCount} match${matchCount === 1 ? " is" : "es are"} linked — unlink them first.`
                : "This tournament has no matches linked and can be removed."}
            </p>
            <input type="hidden" name="id" value={tournament.id} />
            <FormMessage state={deleteState} />
            <ConfirmSubmit
              message={`Delete ${tournament.name}?`}
              className="btn-destructive mt-2 w-full"
            >
              <TrashIcon width={15} height={15} />
              Delete tournament
            </ConfirmSubmit>
          </form>
        </div>
      </Sheet>
    </>
  );
}
