"use client";

import { useActionState, useState } from "react";
import { createSavingsFund } from "../../actions";
import { initialFormState } from "../../form-state";

type Props = {
  spaceId: string;
};

export default function CreateSavingsFundForm({ spaceId }: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    createSavingsFund,
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
          + New fund
        </button>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="mt-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
    >
      {/* createSavingsFund reads space_id from FormData to know which
          space to insert the fund into. */}
      <input type="hidden" name="space_id" value={spaceId} />
      <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">
        New savings fund
      </h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label
            htmlFor="name"
            className="block text-xs font-medium text-gray-700 dark:text-gray-300"
          >
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="e.g. Emergency fund"
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-500"
          />
        </div>
        <div>
          <label
            htmlFor="starting_balance"
            className="block text-xs font-medium text-gray-700 dark:text-gray-300"
          >
            Starting balance (BRL)
          </label>
          <input
            id="starting_balance"
            name="starting_balance"
            type="number"
            min="0"
            step="0.01"
            defaultValue="0"
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
          {isPending ? "Creating…" : "Create fund"}
        </button>
      </div>
    </form>
  );
}
