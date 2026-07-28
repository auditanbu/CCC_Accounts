"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import {
  createGroundAction,
  deleteGroundAction,
  updateGroundAction,
} from "@/app/actions/grounds";
import { idleState } from "@/app/actions/types";
import { ConfirmSubmit, Field, FormMessage, SubmitButton } from "@/components/ui/Form";
import { Sheet } from "@/components/ui/Sheet";
import { PencilIcon, PlusIcon, TrashIcon } from "@/components/ui/Icons";

export type GroundValues = {
  id: number;
  name: string;
  location: string | null;
  googleMapUrl: string | null;
};

function Fields({
  initial,
  fieldErrors,
}: {
  initial?: GroundValues;
  fieldErrors: Record<string, string>;
}) {
  const key = initial?.id ?? "new";
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Ground name" htmlFor={`g-name-${key}`} error={fieldErrors.name}>
        <input
          id={`g-name-${key}`}
          name="name"
          type="text"
          required
          maxLength={80}
          placeholder="e.g. YMCA Ground"
          defaultValue={initial?.name ?? ""}
          className="input"
        />
      </Field>

      <Field label="Location" htmlFor={`g-loc-${key}`} error={fieldErrors.location} hint="Optional.">
        <input
          id={`g-loc-${key}`}
          name="location"
          type="text"
          maxLength={120}
          placeholder="e.g. Nandanam, Chennai"
          defaultValue={initial?.location ?? ""}
          className="input"
        />
      </Field>

      <Field
        label="Google Map"
        htmlFor={`g-map-${key}`}
        error={fieldErrors.googleMapUrl}
        hint="Optional. Paste the share link from Google Maps — players get a tappable directions link."
        className="sm:col-span-2"
      >
        <input
          id={`g-map-${key}`}
          name="googleMapUrl"
          type="url"
          inputMode="url"
          maxLength={500}
          placeholder="https://maps.app.goo.gl/…"
          defaultValue={initial?.googleMapUrl ?? ""}
          className="input"
        />
      </Field>
    </div>
  );
}

export function AddGroundForm() {
  const [state, action] = useActionState(createGroundAction, idleState);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-primary w-full sm:w-auto">
        <PlusIcon width={18} height={18} strokeWidth={2.2} />
        Add ground
      </button>
    );
  }

  return (
    <form ref={formRef} action={action} className="card-pad animate-fade-in-up space-y-4">
      <p className="section-title">New ground</p>
      <Fields fieldErrors={state.fieldErrors ?? {}} />
      <FormMessage state={state} />
      <div className="flex gap-2">
        <SubmitButton className="btn-primary flex-1">Add ground</SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
          Close
        </button>
      </div>
    </form>
  );
}

export function EditGroundButton({
  ground,
  matchCount,
}: {
  ground: GroundValues;
  matchCount: number;
}) {
  const [state, action] = useActionState(updateGroundAction, idleState);
  const [deleteState, deleteAction] = useActionState(deleteGroundAction, idleState);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-sm px-2 text-label-tertiary hover:text-ios-blue"
        aria-label={`Edit ${ground.name}`}
      >
        <PencilIcon width={17} height={17} />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Edit ground">
        <div className="space-y-4">
          <form action={action} className="card-pad space-y-4">
            <input type="hidden" name="id" value={ground.id} />
            <Fields initial={ground} fieldErrors={state.fieldErrors ?? {}} />
            <FormMessage state={state} />
            <SubmitButton className="btn-primary w-full">Save changes</SubmitButton>
          </form>

          <form action={deleteAction} className="card-pad">
            <p className="text-[15px] font-semibold">Delete ground</p>
            <p className="mb-3 mt-1 text-[13px] text-label-secondary">
              {matchCount > 0
                ? `${matchCount} match${matchCount === 1 ? " uses" : "es use"} this ground, so it can't be deleted.`
                : "No matches use this ground, so it can be removed."}
            </p>
            <input type="hidden" name="id" value={ground.id} />
            <FormMessage state={deleteState} />
            <ConfirmSubmit message={`Delete ${ground.name}?`} className="btn-destructive mt-2 w-full">
              <TrashIcon width={15} height={15} />
              Delete ground
            </ConfirmSubmit>
          </form>
        </div>
      </Sheet>
    </>
  );
}
