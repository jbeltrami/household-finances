"use client";

import { useActionState, useState } from "react";
import { createSavingsContribution } from "../../../actions";
import { initialFormState } from "../../../form-state";
import { currentYearMonth } from "@/helpers/date";

type Props = {
  fundId: string;
};

// Accordion create-contribution form. Shows a button in collapsed state;
// expands to a form with a deposit/withdraw toggle, amount, month, and
// optional notes. The month defaults to the current YYYY-MM so the
// common case is one field of typing.
export default function CreateContributionForm({ fundId }: Props) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"deposit" | "withdraw">("deposit");

  const boundAction = createSavingsContribution.bind(null, fundId);
  const [state, formAction, isPending] = useActionState(
    boundAction,
    initialFormState
  );

  if (!open) {
    return (
      <div className="mt-6">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md border border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800"
        >
          + Log contribution
        </button>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="mt-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
    >
      <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">
        New contribution
      </h2>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setType("deposit")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            type === "deposit"
              ? "bg-green-600 text-white hover:bg-green-700"
              : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          }`}
        >
          Deposit
        </button>
        <button
          type="button"
          onClick={() => setType("withdraw")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            type === "withdraw"
              ? "bg-red-600 text-white hover:bg-red-700"
              : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          }`}
        >
          Withdraw
        </button>
      </div>
      <input type="hidden" name="type" value={type} />

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="amount"
            className="block text-xs font-medium text-gray-700 dark:text-gray-300"
          >
            Amount (BRL)
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            required
            placeholder="0.00"
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-500"
          />
        </div>
        <div>
          <label
            htmlFor="month"
            className="block text-xs font-medium text-gray-700 dark:text-gray-300"
          >
            Month
          </label>
          <input
            id="month"
            name="month"
            type="month"
            required
            defaultValue={currentYearMonth()}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label
            htmlFor="notes"
            className="block text-xs font-medium text-gray-700 dark:text-gray-300"
          >
            Notes (optional)
          </label>
          <input
            id="notes"
            name="notes"
            type="text"
            placeholder="e.g. Bonus from Q1 freelance"
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-500"
          />
        </div>
      </div>

      {state.error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={isPending}
          className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
        >
          {isPending ? "Saving…" : "Save contribution"}
        </button>
      </div>
    </form>
  );
}
