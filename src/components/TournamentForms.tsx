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
};

function Fields({
  initial,
  fieldErrors,
}: {
  initial?: TournamentValues;
  fieldErrors: Record<string, string>;
}) {
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
        label="Total entry fee ₹"
        htmlFor={`t-fee-${initial?.id ?? "new"}`}
        error={fieldErrors.totalFee}
        className="sm:col-span-2"
      >
        <input
          id={`t-fee-${initial?.id ?? "new"}`}
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
    </div>
  );
}

export function AddTournamentForm() {
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
      <Fields fieldErrors={state.fieldErrors ?? {}} />
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

export function EditTournamentPanel({
  tournament,
  matchCount,
}: {
  tournament: TournamentValues;
  matchCount: number;
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
            <Fields initial={tournament} fieldErrors={state.fieldErrors ?? {}} />
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
