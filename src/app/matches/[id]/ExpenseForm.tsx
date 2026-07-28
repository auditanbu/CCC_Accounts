"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { addExpenseAction } from "@/app/actions/matches";
import { idleState } from "@/app/actions/types";
import { Field, FormMessage, SubmitButton } from "@/components/ui/Form";
import { PlusIcon } from "@/components/ui/Icons";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

export function ExpenseForm({ matchId }: { matchId: number }) {
  const [state, action] = useActionState(addExpenseAction, idleState);
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the row after a successful add so the next one can be typed straight in.
  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setCategory(EXPENSE_CATEGORIES[0]);
    }
  }, [state]);

  const err = state.fieldErrors ?? {};

  return (
    <form ref={formRef} action={action} className="card-pad space-y-4">
      <input type="hidden" name="matchId" value={matchId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category" htmlFor="category" error={err.category}>
          <select
            id="category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="select"
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Amount ₹" htmlFor="amount" error={err.amount}>
          <input
            id="amount"
            name="amount"
            type="number"
            inputMode="decimal"
            min={0}
            step="1"
            required
            placeholder="0"
            className="input"
          />
        </Field>
      </div>

      {category === "Others" ? (
        <Field
          label="Describe it"
          htmlFor="customCategory"
          error={err.customCategory}
          hint="Saved as its own category so it groups in reports."
          className="animate-fade-in-up"
        >
          <input
            id="customCategory"
            name="customCategory"
            type="text"
            maxLength={60}
            placeholder="e.g. Kit repair"
            className="input"
          />
        </Field>
      ) : (
        <input type="hidden" name="customCategory" value="" />
      )}

      <Field label="Note" htmlFor="note" error={err.note} hint="Optional.">
        <input
          id="note"
          name="note"
          type="text"
          maxLength={200}
          placeholder="Who paid, receipt no., etc."
          className="input"
        />
      </Field>

      <FormMessage state={state} />

      <SubmitButton className="btn-primary w-full sm:w-auto">
        <PlusIcon width={17} height={17} strokeWidth={2.2} />
        Add expense
      </SubmitButton>
    </form>
  );
}
