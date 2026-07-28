"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { createPlayerAction, updatePlayerAction } from "@/app/actions/players";
import { idleState } from "@/app/actions/types";
import { Field, FormMessage, SubmitButton } from "@/components/ui/Form";
import { PlusIcon } from "@/components/ui/Icons";
import { MATCH_FEE_OPTIONS } from "@/lib/constants";
import { formatMoney } from "@/lib/format";

export type PlayerValues = {
  id: number;
  name: string;
  jerseyNumber: number;
  mobileNumber: string | null;
  status: "ACTIVE" | "INACTIVE";
  defaultMatchFee: number;
  openingBalance: number;
};

function Fields({
  initial,
  fieldErrors,
  suggestedJersey,
}: {
  initial?: PlayerValues;
  fieldErrors: Record<string, string>;
  suggestedJersey?: number;
}) {
  const [fee, setFee] = useState<number>(initial?.defaultMatchFee ?? MATCH_FEE_OPTIONS[0]);
  const isCustomFee = !(MATCH_FEE_OPTIONS as readonly number[]).includes(fee);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="name" error={fieldErrors.name}>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={60}
            placeholder="Player name"
            defaultValue={initial?.name ?? ""}
            className="input"
          />
        </Field>

        <Field label="Jersey number" htmlFor="jerseyNumber" error={fieldErrors.jerseyNumber}>
          <input
            id="jerseyNumber"
            name="jerseyNumber"
            type="number"
            inputMode="numeric"
            required
            min={0}
            max={999}
            placeholder="7"
            defaultValue={initial?.jerseyNumber ?? suggestedJersey ?? ""}
            className="input"
          />
        </Field>

        <Field label="Mobile number" htmlFor="mobileNumber" error={fieldErrors.mobileNumber}>
          <input
            id="mobileNumber"
            name="mobileNumber"
            type="tel"
            inputMode="tel"
            maxLength={20}
            placeholder="98765 43210"
            defaultValue={initial?.mobileNumber ?? ""}
            className="input"
          />
        </Field>

        <Field label="Status" htmlFor="status" error={fieldErrors.status}>
          <select
            id="status"
            name="status"
            defaultValue={initial?.status ?? "ACTIVE"}
            className="select"
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </Field>
      </div>

      <div>
        <span className="label">Default match fee</span>
        <div className="flex gap-1 rounded-xl bg-black/[0.05] p-1">
          {MATCH_FEE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFee(option)}
              aria-pressed={fee === option}
              className={`flex-1 rounded-[9px] py-2 text-[14px] font-semibold transition-all ${
                fee === option
                  ? "bg-white text-label shadow-sm"
                  : "text-label-secondary active:opacity-60"
              }`}
            >
              {formatMoney(option)}
            </button>
          ))}
          {isCustomFee ? (
            <span className="flex-1 rounded-[9px] bg-white py-2 text-center text-[14px] font-semibold shadow-sm">
              {formatMoney(fee)}
            </span>
          ) : null}
        </div>
        <input type="hidden" name="defaultMatchFee" value={fee} />
        <p className="mt-1.5 text-[12px] text-label-secondary">
          Filled in automatically when this player is picked for a match.
        </p>
      </div>

      <Field
        label="Opening balance ₹"
        htmlFor={`opening-${initial?.id ?? "new"}`}
        error={fieldErrors.openingBalance}
        hint="Carried over from the old ledger. Positive if they owe, negative if they've paid excess. Counts towards their pending total."
      >
        <input
          id={`opening-${initial?.id ?? "new"}`}
          name="openingBalance"
          type="number"
          inputMode="decimal"
          step="1"
          placeholder="0"
          defaultValue={initial?.openingBalance ?? ""}
          className="input"
        />
      </Field>
    </>
  );
}

/** Collapsible "add player" card shown at the top of the squad list. */
export function AddPlayerForm({ suggestedJersey }: { suggestedJersey?: number }) {
  const [state, action] = useActionState(createPlayerAction, idleState);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-primary w-full sm:w-auto">
        <PlusIcon width={18} height={18} strokeWidth={2.2} />
        Add player
      </button>
    );
  }

  return (
    <form ref={formRef} action={action} className="card-pad animate-fade-in-up space-y-4">
      <p className="section-title">New player</p>
      <Fields fieldErrors={state.fieldErrors ?? {}} suggestedJersey={suggestedJersey} />
      <FormMessage state={state} />
      <div className="flex gap-2">
        <SubmitButton className="btn-primary flex-1">Add to squad</SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
          Close
        </button>
      </div>
    </form>
  );
}

export function EditPlayerForm({ player }: { player: PlayerValues }) {
  const [state, action] = useActionState(updatePlayerAction, idleState);

  return (
    <form action={action} className="card-pad space-y-4">
      <input type="hidden" name="id" value={player.id} />
      <p className="section-title">Player details</p>
      <Fields initial={player} fieldErrors={state.fieldErrors ?? {}} />
      <FormMessage state={state} />
      <SubmitButton className="btn-primary w-full sm:w-auto">Save changes</SubmitButton>
    </form>
  );
}
