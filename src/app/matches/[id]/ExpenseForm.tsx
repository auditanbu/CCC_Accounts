"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { addExpenseAction, addIncomeAction } from "@/app/actions/matches";
import { idleState } from "@/app/actions/types";
import { Field, FormMessage, SubmitButton } from "@/components/ui/Form";
import { PlusIcon } from "@/components/ui/Icons";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/constants";

export type MoneyLineKind = "expense" | "income";

const FORM_COPY = {
  expense: {
    action: addExpenseAction,
    categories: EXPENSE_CATEGORIES as readonly string[],
    otherPlaceholder: "e.g. Kit repair",
    notePlaceholder: "Who paid, receipt no., etc.",
    button: "Add expense",
  },
  income: {
    action: addIncomeAction,
    categories: INCOME_CATEGORIES as readonly string[],
    otherPlaceholder: "e.g. Old balls sold",
    notePlaceholder: "Who gave it, received by, etc.",
    button: "Add income",
  },
} as const;

export function ExpenseForm({
  matchId,
  kind = "expense",
}: {
  matchId: number;
  kind?: MoneyLineKind;
}) {
  const copy = FORM_COPY[kind];
  const [state, action] = useActionState(copy.action, idleState);
  const [category, setCategory] = useState<string>(copy.categories[0]);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the row after a successful add so the next one can be typed straight in.
  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setCategory(copy.categories[0]);
    }
  }, [state, copy]);

  const err = state.fieldErrors ?? {};

  return (
    <form ref={formRef} action={action} className="card-pad space-y-4">
      <input type="hidden" name="matchId" value={matchId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category" htmlFor={`${kind}-category`} error={err.category}>
          <select
            id={`${kind}-category`}
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="select"
          >
            {copy.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Amount ₹" htmlFor={`${kind}-amount`} error={err.amount}>
          <input
            id={`${kind}-amount`}
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
          htmlFor={`${kind}-customCategory`}
          error={err.customCategory}
          hint="Saved as its own category so it groups in reports."
          className="animate-fade-in-up"
        >
          <input
            id={`${kind}-customCategory`}
            name="customCategory"
            type="text"
            maxLength={60}
            placeholder={copy.otherPlaceholder}
            className="input"
          />
        </Field>
      ) : (
        <input type="hidden" name="customCategory" value="" />
      )}

      <Field label="Note" htmlFor={`${kind}-note`} error={err.note} hint="Optional.">
        <input
          id={`${kind}-note`}
          name="note"
          type="text"
          maxLength={200}
          placeholder={copy.notePlaceholder}
          className="input"
        />
      </Field>

      <FormMessage state={state} />

      <SubmitButton className="btn-primary w-full sm:w-auto">
        <PlusIcon width={17} height={17} strokeWidth={2.2} />
        {copy.button}
      </SubmitButton>
    </form>
  );
}
