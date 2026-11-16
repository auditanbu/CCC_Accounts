"use client";

import { useState } from "react";

import { ExpenseForm, type MoneyLineKind } from "@/app/matches/[id]/ExpenseForm";
import { deleteExpenseAction, deleteIncomeAction } from "@/app/actions/matches";
import { EmptyState } from "@/components/ui/Card";
import { ConfirmSubmit } from "@/components/ui/Form";
import { PencilIcon, TrashIcon } from "@/components/ui/Icons";
import { CATEGORY_COLORS } from "@/lib/constants";
import { formatMoney } from "@/lib/format";

export type ExpenseRow = { id: number; category: string; note: string | null; amount: number };

const SECTION_COPY = {
  expense: {
    deleteAction: deleteExpenseAction,
    emptyIcon: "🧾",
    emptyTitle: "No expenses recorded",
    emptyEdit: "Add ball fee, ground fee, water and anything else spent on this match.",
    emptyView: "Nothing has been spent on this match yet.",
    noun: "expense",
  },
  income: {
    deleteAction: deleteIncomeAction,
    emptyIcon: "💰",
    emptyTitle: "No income recorded",
    emptyEdit: "Add prize money, sponsorship, guest player fees and any other money received.",
    emptyView: "No other income has been received for this match.",
    noun: "income",
  },
} as const;

export function ExpenseSection({
  matchId,
  expenses,
  admin,
  kind = "expense",
}: {
  matchId: number;
  /** The rows to list — expense or income lines, per `kind`. */
  expenses: ExpenseRow[];
  admin: boolean;
  kind?: MoneyLineKind;
}) {
  const copy = SECTION_COPY[kind];
  const [editing, setEditing] = useState(false);
  const canEdit = admin && editing;

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

      {expenses.length === 0 ? (
        <EmptyState
          icon={copy.emptyIcon}
          title={copy.emptyTitle}
          description={
canEdit ? copy.emptyEdit : copy.emptyView
          }
        />
      ) : (
        <ul className="list-group">
          {expenses.map((e) => (
            <li key={e.id} className="list-row">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                  CATEGORY_COLORS[e.category] ?? "bg-ios-gray"
                }`}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">{e.category}</span>
                {e.note ? (
                  <span className="block truncate text-[12px] text-label-secondary">{e.note}</span>
                ) : null}
              </span>
              <span className="tnum shrink-0 text-[15px] font-semibold">
                {formatMoney(e.amount)}
              </span>
              {canEdit ? (
                <form action={copy.deleteAction} className="shrink-0">
                  <input type="hidden" name="id" value={e.id} />
                  <ConfirmSubmit
                    message={`Delete the ${e.category} ${copy.noun} of ${formatMoney(e.amount)}?`}
                    className="btn btn-sm -mr-1.5 px-1.5 text-label-tertiary hover:text-ios-red"
                  >
                    <TrashIcon width={17} height={17} />
                    <span className="sr-only">Delete {copy.noun}</span>
                  </ConfirmSubmit>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canEdit ? <ExpenseForm matchId={matchId} kind={kind} /> : null}
    </div>
  );
}
