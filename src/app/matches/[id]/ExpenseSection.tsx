"use client";

import { useState } from "react";

import { ExpenseForm } from "@/app/matches/[id]/ExpenseForm";
import { deleteExpenseAction } from "@/app/actions/matches";
import { EmptyState } from "@/components/ui/Card";
import { ConfirmSubmit } from "@/components/ui/Form";
import { PencilIcon, TrashIcon } from "@/components/ui/Icons";
import { CATEGORY_COLORS } from "@/lib/constants";
import { formatMoney } from "@/lib/format";

export type ExpenseRow = { id: number; category: string; note: string | null; amount: number };

export function ExpenseSection({
  matchId,
  expenses,
  admin,
}: {
  matchId: number;
  expenses: ExpenseRow[];
  admin: boolean;
}) {
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
            <PencilIcon width={15} height={15} />
            {editing ? "Done" : "Edit"}
          </button>
        </div>
      ) : null}

      {expenses.length === 0 ? (
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
                <form action={deleteExpenseAction} className="shrink-0">
                  <input type="hidden" name="id" value={e.id} />
                  <ConfirmSubmit
                    message={`Delete the ${e.category} expense of ${formatMoney(e.amount)}?`}
                    className="btn btn-sm -mr-1.5 px-1.5 text-label-tertiary hover:text-ios-red"
                  >
                    <TrashIcon width={17} height={17} />
                    <span className="sr-only">Delete expense</span>
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
