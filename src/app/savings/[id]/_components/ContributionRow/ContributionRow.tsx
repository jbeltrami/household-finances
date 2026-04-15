"use client";

import { useState, useTransition } from "react";
import { brlFormatter } from "@/helpers/format";
import {
  deleteSavingsContribution,
  updateSavingsContribution,
} from "../../../actions";
import type { SavingsContributionRow } from "../../../_types";

type Props = {
  contribution: SavingsContributionRow;
};

// A single contribution row with inline edit and delete. The sign of
// `amount` determines deposit vs withdraw — we split it into a type +
// absolute amount when entering edit mode so the user toggles semantics
// rather than typing a negative number.
export default function ContributionRow({ contribution }: Props) {
  const initialSigned = Number(contribution.amount);
  const initialType: "deposit" | "withdraw" =
    initialSigned >= 0 ? "deposit" : "withdraw";

  const [editing, setEditing] = useState(false);
  const [type, setType] = useState<"deposit" | "withdraw">(initialType);
  const [error, setError] = useState<string | null>(null);

  const [isUpdating, startUpdate] = useTransition();
  const handleUpdate = (formData: FormData) => {
    startUpdate(async () => {
      const result = await updateSavingsContribution(
        contribution.id,
        { error: null },
        formData
      );
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        setEditing(false);
      }
    });
  };

  const [isDeleting, startDelete] = useTransition();
  const handleDelete = () => {
    if (!window.confirm("Delete this contribution?")) return;
    startDelete(async () => {
      const result = await deleteSavingsContribution(contribution.id);
      if (result.error) {
        setError(result.error);
      }
    });
  };

  const handleCancel = () => {
    setEditing(false);
    setError(null);
    setType(initialType);
  };

  if (editing) {
    return (
      <li className="flex flex-col gap-2 px-4 py-3">
        <form
          action={handleUpdate}
          className="flex flex-wrap items-center gap-2"
        >
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setType("deposit")}
              className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                type === "deposit"
                  ? "bg-green-600 text-white"
                  : "border border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300"
              }`}
            >
              Deposit
            </button>
            <button
              type="button"
              onClick={() => setType("withdraw")}
              className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                type === "withdraw"
                  ? "bg-red-600 text-white"
                  : "border border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300"
              }`}
            >
              Withdraw
            </button>
          </div>
          <input type="hidden" name="type" value={type} />

          <input
            type="number"
            name="amount"
            min="0.01"
            step="0.01"
            required
            defaultValue={String(Math.abs(initialSigned))}
            autoFocus
            className="w-28 rounded-md border border-gray-300 bg-white px-2 py-1 text-right text-sm text-gray-900 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <input
            type="text"
            name="notes"
            defaultValue={contribution.notes ?? ""}
            placeholder="notes"
            className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
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
            onClick={handleCancel}
            disabled={isUpdating}
            className="rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        </form>
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
      </li>
    );
  }

  const isDeposit = initialSigned >= 0;
  return (
    <li className="flex items-center justify-between px-4 py-3">
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-medium ${
            isDeposit
              ? "text-green-700 dark:text-green-400"
              : "text-red-700 dark:text-red-400"
          }`}
        >
          {isDeposit ? "+" : ""}
          {brlFormatter.format(initialSigned)}
        </p>
        {contribution.notes && (
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {contribution.notes}
          </p>
        )}
        {error && (
          <p className="mt-0.5 text-xs text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
        >
          {isDeleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </li>
  );
}
