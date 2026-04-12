"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  toggleBillPaid,
  updateBillInstanceAmount,
} from "./actions";
import { initialFormState } from "./form-state";

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// Format due dates in UTC so the stored `YYYY-MM-DD` calendar date is
// shown verbatim. Without `timeZone: "UTC"`, `new Date("2026-04-01")`
// parses as UTC midnight and, when formatted in a negative-offset
// timezone like Brazil (UTC-3), renders as the previous day (31/03).
const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});

type BillInstance = {
  id: string;
  name: string;
  amount: number | string;
  due_date: string | null;
  paid: boolean;
};

type Props = {
  instance: BillInstance;
  year: number;
  month: number;
  locked: boolean;
};

export default function BillInstanceRow({
  instance,
  year,
  month,
  locked,
}: Props) {
  const [editing, setEditing] = useState(false);

  // Bind id + year + month into the actions so the form only needs to pass
  // FormData (or no args at all for the toggle).
  const togglePaidAction = toggleBillPaid.bind(
    null,
    instance.id,
    !instance.paid,
    year,
    month
  );

  const updateAction = updateBillInstanceAmount.bind(
    null,
    instance.id,
    year,
    month
  );
  const [updateState, formAction, isUpdating] = useActionState(
    updateAction,
    initialFormState
  );

  // Close edit mode when an update succeeds. We detect this by watching
  // isUpdating transition from true → false while updateState.error is null.
  // The ref tracks the previous value of isUpdating across renders.
  const wasUpdating = useRef(false);
  useEffect(() => {
    if (wasUpdating.current && !isUpdating && !updateState.error) {
      setEditing(false);
    }
    wasUpdating.current = isUpdating;
  }, [isUpdating, updateState.error]);

  return (
    <li className="flex items-center justify-between px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {instance.name}
        </p>
        {instance.due_date && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Due {dateFormatter.format(new Date(instance.due_date))}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {editing && !locked ? (
          <form action={formAction} className="flex items-center gap-2">
            <input
              type="number"
              name="amount"
              min="0"
              step="5"
              required
              defaultValue={String(instance.amount)}
              autoFocus
              className="w-28 rounded-md border border-gray-300 bg-white px-2 py-1 text-right text-sm text-gray-900 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
            <button
              type="submit"
              disabled={isUpdating}
              className="rounded-md bg-gray-900 px-3 py-1 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
            >
              {isUpdating ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={isUpdating}
              className="rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </form>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {brlFormatter.format(Number(instance.amount))}
            </p>
            {!locked && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Edit
              </button>
            )}
          </>
        )}

        {locked ? (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              instance.paid
                ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200"
            }`}
          >
            {instance.paid ? "paid" : "pending"}
          </span>
        ) : (
          <form action={togglePaidAction}>
            <button
              type="submit"
              className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                instance.paid
                  ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-200 dark:hover:bg-green-900/60"
                  : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-200 dark:hover:bg-yellow-900/60"
              }`}
              title={instance.paid ? "Mark as pending" : "Mark as paid"}
            >
              {instance.paid ? "paid" : "pending"}
            </button>
          </form>
        )}
      </div>

      {updateState.error && editing && (
        <p
          className="absolute mt-12 text-xs text-red-600 dark:text-red-400"
          role="alert"
        >
          {updateState.error}
        </p>
      )}
    </li>
  );
}
