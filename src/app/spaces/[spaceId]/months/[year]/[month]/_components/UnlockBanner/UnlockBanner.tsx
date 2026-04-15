"use client";

import { useActionState, useState } from "react";
import { unlockMonth } from "../../actions";
import { initialFormState } from "../../form-state";

type Props = {
  monthId: string;
  year: number;
  month: number;
};

export default function UnlockBanner({ monthId, year, month }: Props) {
  const [showForm, setShowForm] = useState(false);

  const boundAction = unlockMonth.bind(null, monthId, year, month);
  const [state, formAction, isPending] = useActionState(
    boundAction,
    initialFormState
  );

  return (
    <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/30">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            This month is locked
          </p>
          <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
            Past months are read-only by default. Unlock this month with a
            written reason if you need to edit it.
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="shrink-0 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600"
          >
            Unlock
          </button>
        )}
      </div>

      {showForm && (
        <form action={formAction} className="mt-4">
          <label
            htmlFor="reason"
            className="block text-xs font-medium text-amber-900 dark:text-amber-200"
          >
            Reason for unlocking
          </label>
          <textarea
            id="reason"
            name="reason"
            required
            rows={2}
            minLength={5}
            placeholder="e.g. Fixing a mistake in Claro's amount"
            className="mt-1 w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-amber-500 focus:outline-none dark:border-amber-700 dark:bg-gray-900 dark:text-gray-100"
          />

          {state.error && (
            <p
              className="mt-2 text-xs text-red-600 dark:text-red-400"
              role="alert"
            >
              {state.error}
            </p>
          )}

          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              disabled={isPending}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50 dark:text-amber-200 dark:hover:bg-amber-900/50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50 dark:bg-amber-700 dark:hover:bg-amber-600"
            >
              {isPending ? "Unlocking…" : "Unlock month"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
