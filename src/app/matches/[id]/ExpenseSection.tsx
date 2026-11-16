"use client";

import { useState } from "react";

import { ExpenseForm } from "@/app/matches/[id]/ExpenseForm";
import { deleteExpenseAction, deleteIncomeAction } from "@/app/actions/matches";
import { EmptyState } from "@/components/ui/Card";
import { ConfirmSubmit } from "@/components/ui/Form";
import { PencilIcon, TrashIcon } from "@/components/ui/Icons";
import { CATEGORY_COLORS } from "@/lib/constants";
import { formatMoney } from "@/lib/format";

export type ExpenseRow = { id: number; category: string; note: string | null; amount: number };

export function ExpenseSection({
  matchId,
  expenses,
  incomes = [],
  admin,
}: {
  matchId: number;
  expenses: ExpenseRow[];
  /** Money received for the match — listed with the expenses, shown in green. */
  incomes?: ExpenseRow[];
  admin: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const canEdit = admin && editing;

  const rows = [
    ...expenses.map((e) => ({ ...e, income: false })),
    ...incomes.map((e) => ({ ...e, income: true })),
  ];

  return (
    <div className="space-y-3">
      {admin ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="btn-secondary btn-sm"
          >
            {editing ? (
              "Done"
            ) : (
              <>
                <PencilIcon width={15} height={15} />
                Edit
              </>
            )}
          </button>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          icon="🧾"
          title="No expenses recorded"
          description={
            canEdit
              ? "Add ball fee, ground fee, water and anything else spent on this match."
              : "Nothing has been spent on this match yet."
          }
        />
      ) : (
        <ul className="list-group">
          {rows.map((e) => (
            <li key={`${e.income ? "i" : "e"}${e.id}`} className="list-row">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                  e.income ? "bg-ios-green" : (CATEGORY_COLORS[e.category] ?? "bg-ios-gray")
                }`}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">{e.category}</span>
                {e.note ? (
                  <span className="block truncate text-[12px] text-label-secondary">{e.note}</span>
                ) : null}
              </span>
              <span
                className={`tnum shrink-0 text-[15px] font-semibold ${
                  e.income ? "text-[#248A3D]" : ""
                }`}
              >
                {e.income ? "+ " : ""}
                {formatMoney(e.amount)}
              </span>
              {canEdit ? (
                <form
                  action={e.income ? deleteIncomeAction : deleteExpenseAction}
                  className="shrink-0"
                >
                  <input type="hidden" name="id" value={e.id} />
                  <ConfirmSubmit
                    message={`Delete the ${e.category} ${e.income ? "entry" : "expense"} of ${formatMoney(e.amount)}?`}
                    className="btn btn-sm -mr-1.5 px-1.5 text-label-tertiary hover:text-ios-red"
                  >
                    <TrashIcon width={17} height={17} />
                    <span className="sr-only">Delete {e.income ? "income" : "expense"}</span>
                  </ConfirmSubmit>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canEdit ? <ExpenseForm matchId={matchId} /> : null}
    </div>
  );
}
