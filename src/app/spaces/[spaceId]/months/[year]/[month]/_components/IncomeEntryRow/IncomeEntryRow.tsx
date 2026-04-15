"use client";

import { useState, useTransition } from "react";
import { brlFormatter, dateFormatter } from "@/helpers/format";
import {
  deleteIncomeEntry,
  toggleIncomeReceived,
  updateIncomeAmount,
} from "../../actions";
import type { IncomeRow } from "../../_types";

type Props = {
  entry: IncomeRow;
  year: number;
  month: number;
  locked: boolean;
  highlightedDay: number | null;
};

export default function IncomeEntryRow({
  entry,
  year,
  month,
  locked,
  highlightedDay,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Parse the expected-date day directly from the YYYY-MM-DD string so we
  // avoid the UTC timezone trap. Then compare against highlightedDay from
  // the calendar click handler.
  const expectedDay = entry.expected_date
    ? parseInt(entry.expected_date.split("-")[2], 10)
    : null;
  const isHighlighted =
    highlightedDay !== null &&
    expectedDay !== null &&
    expectedDay === highlightedDay;

  const toggleReceivedAction = toggleIncomeReceived.bind(
    null,
    entry.id,
    !entry.received,
    year,
    month
  );

  // Update is invoked via useTransition rather than useActionState so we
  // can close edit mode in the success branch of the click handler — no
  // useEffect / setState-in-effect anti-pattern. The form action receives
  // FormData and forwards it to the server action manually, with the
  // editor having full control over what happens after the response.
  const [isUpdating, startUpdate] = useTransition();
  const handleUpdate = (formData: FormData) => {
    startUpdate(async () => {
      const result = await updateIncomeAmount(
        entry.id,
        year,
        month,
        { error: null },
        formData
      );
      if (result.error) {
        setUpdateError(result.error);
      } else {
        setUpdateError(null);
        setEditing(false);
      }
    });
  };

  const handleCancel = () => {
    setEditing(false);
    setUpdateError(null);
  };

  // Delete is also invoked via useTransition. window.confirm() gates the
  // call — simple and good enough for a personal app.
  const [isDeleting, startDelete] = useTransition();
  const handleDelete = () => {
    if (!window.confirm(`Delete "${entry.name}"?`)) return;
    startDelete(async () => {
      await deleteIncomeEntry(entry.id, year, month);
    });
  };

  return (
    <li
      className={`flex items-center justify-between px-4 py-3 transition-colors ${
        isHighlighted ? "bg-blue-50 dark:bg-blue-900/20" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {entry.name}
        </p>
        {entry.expected_date && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Expected {dateFormatter.format(new Date(entry.expected_date))}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {editing && !locked ? (
          <form action={handleUpdate} className="flex items-center gap-2">
            <input
              type="number"
              name="amount"
              min="0"
              step="5"
              required
              defaultValue={String(entry.amount)}
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
              onClick={handleCancel}
              disabled={isUpdating}
              className="rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </form>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {brlFormatter.format(Number(entry.amount))}
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
              entry.received
                ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200"
            }`}
          >
            {entry.received ? "received" : "pending"}
          </span>
        ) : (
          <form action={toggleReceivedAction}>
            <button
              type="submit"
              className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                entry.received
                  ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-200 dark:hover:bg-green-900/60"
                  : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-200 dark:hover:bg-yellow-900/60"
              }`}
              title={entry.received ? "Mark as pending" : "Mark as received"}
            >
              {entry.received ? "received" : "pending"}
            </button>
          </form>
        )}

        {!locked && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        )}
      </div>

      {updateError && editing && (
        <p
          className="absolute mt-12 text-xs text-red-600 dark:text-red-400"
          role="alert"
        >
          {updateError}
        </p>
      )}
    </li>
  );
}
