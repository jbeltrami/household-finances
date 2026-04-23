"use client";

import { useState, useTransition } from "react";
import { brlFormatter, dateFormatter } from "@/helpers/format";
import {
  overrideEntryAmount,
  skipEntryOccurrence,
  toggleEntryPaid,
  deleteEntry,
  type OverrideAmountTarget,
  type SkipTarget,
  type TogglePaidTarget,
} from "../../actions";
import type { EntryRow } from "../../_types";

type Props = {
  entry: EntryRow;
  year: number;
  month: number;
  locked: boolean;
  highlightedDay: number | null;
  readOnly?: boolean;
  attribution?: string;
};

// Compute the TogglePaidTarget for this entry. Virtual entries carry
// their template+date+space so the server action can materialize a
// new row on first pay; materialized entries just reference their id.
function togglePaidTargetFor(entry: EntryRow): TogglePaidTarget {
  if (entry.id != null) return { kind: "materialized", entryId: entry.id };
  return {
    kind: "virtual",
    templateId: entry.template_id!,
    date: entry.date,
    spaceId: entry.space_id,
  };
}

function overrideTargetFor(entry: EntryRow): OverrideAmountTarget {
  if (entry.id != null) return { kind: "materialized", entryId: entry.id };
  return {
    kind: "virtual",
    templateId: entry.template_id!,
    date: entry.date,
    spaceId: entry.space_id,
  };
}

function skipTargetFor(entry: EntryRow): SkipTarget {
  if (entry.id != null) return { kind: "materialized", entryId: entry.id };
  return {
    kind: "virtual",
    templateId: entry.template_id!,
    date: entry.date,
    spaceId: entry.space_id,
  };
}

export default function BillInstanceRow({
  entry,
  year,
  month,
  locked,
  highlightedDay,
  readOnly,
  attribution,
}: Props) {
  void year;
  void month;

  const noEdit = locked || !!readOnly;
  const [editing, setEditing] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const progress = entry.installmentProgress;
  const isInstallment = progress != null;

  const [coverInput, setCoverInput] = useState(1);

  // Parse the day from the YYYY-MM-DD string directly — no Date parsing.
  const dueDay = parseInt(entry.date.split("-")[2], 10);
  const isHighlighted =
    highlightedDay !== null && dueDay === highlightedDay;

  const [isToggling, startToggle] = useTransition();
  const handleTogglePaid = (coveredOverride?: number) => {
    startToggle(async () => {
      const covered = coveredOverride ?? coverInput;
      await toggleEntryPaid(
        togglePaidTargetFor(entry),
        !entry.paid,
        entry.paid ? 1 : covered,
        new FormData()
      );
    });
  };

  const [isUpdating, startUpdate] = useTransition();
  const handleUpdate = (formData: FormData) => {
    startUpdate(async () => {
      const result = await overrideEntryAmount(
        overrideTargetFor(entry),
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

  const [isSkipping, startSkip] = useTransition();
  const handleSkip = () => {
    if (!window.confirm(`Skip "${entry.name}" for this occurrence?`)) return;
    startSkip(async () => {
      await skipEntryOccurrence(skipTargetFor(entry), new FormData());
    });
  };

  // Delete is only meaningful for materialized entries. For one-offs
  // it removes the row; for exceptions it reverts to virtual state.
  const [isDeleting, startDelete] = useTransition();
  const handleDelete = () => {
    if (entry.id == null) return;
    if (!window.confirm(`Remove override for "${entry.name}"?`)) return;
    startDelete(async () => {
      await deleteEntry(entry.id!);
    });
  };

  const progressBadge = progress
    ? `${progress.paid}/${progress.total}`
    : null;
  const showCoverInput =
    isInstallment &&
    !entry.paid &&
    !noEdit &&
    progress != null &&
    progress.remaining > 1;
  const maxCover = progress?.remaining ?? 1;

  // Materialized entries that aren't paid/skipped are overrides — offer
  // a "revert" affordance via deleteEntry so the row returns to virtual
  // state (template default amount).
  const showRevert =
    entry.id != null && !entry.paid && entry.template_id != null && !noEdit;

  return (
    <li
      className={`flex items-center justify-between px-4 py-3 transition-colors ${
        isHighlighted ? "bg-blue-50 dark:bg-blue-900/20" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
          {attribution && (
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
              {attribution} —
            </span>
          )}
          <span>{entry.name}</span>
          {progressBadge && (
            <span
              className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200"
              title="Installments paid / total"
            >
              {progressBadge}
            </span>
          )}
          {entry.paid && entry.installments_covered > 1 && (
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
              ×{entry.installments_covered} this month
            </span>
          )}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Due {dateFormatter.format(new Date(entry.date))}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {editing && !noEdit ? (
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
              className={`rounded-md px-3 py-1 text-xs font-medium ${
                isUpdating
                  ? "animate-pulse bg-gray-400 text-white dark:bg-gray-600"
                  : "bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
              }`}
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
              {brlFormatter.format(entry.amount)}
            </p>
            {!noEdit && (
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

        {showCoverInput && (
          <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
            <span>covers</span>
            <input
              type="number"
              min={1}
              max={maxCover}
              value={coverInput}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isInteger(n) && n >= 1 && n <= maxCover) {
                  setCoverInput(n);
                }
              }}
              className="w-12 rounded-md border border-gray-300 bg-white px-1 py-0.5 text-center text-xs text-gray-900 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
            {maxCover > 1 && coverInput < maxCover && (
              <button
                type="button"
                onClick={() => handleTogglePaid(maxCover)}
                disabled={isToggling}
                className="rounded-md px-1.5 py-0.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700"
                title={`Pay off all ${maxCover} remaining`}
              >
                pay all
              </button>
            )}
          </div>
        )}

        {noEdit ? (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              entry.paid
                ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200"
            }`}
          >
            {entry.paid ? "paid" : "pending"}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => handleTogglePaid()}
            disabled={isToggling}
            className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
              isToggling
                ? "animate-pulse bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                : entry.paid
                  ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-200 dark:hover:bg-green-900/60"
                  : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-200 dark:hover:bg-yellow-900/60"
            }`}
            title={entry.paid ? "Mark as pending" : "Mark as paid"}
          >
            {isToggling ? "…" : entry.paid ? "paid" : "pending"}
          </button>
        )}

        {!noEdit && !entry.paid && (
          <button
            type="button"
            onClick={handleSkip}
            disabled={isSkipping}
            className={`text-xs font-medium ${
              isSkipping
                ? "animate-pulse text-gray-400 dark:text-gray-500"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
            title="Skip this occurrence"
          >
            {isSkipping ? "…" : "Skip"}
          </button>
        )}

        {showRevert && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className={`text-xs font-medium ${
              isDeleting
                ? "animate-pulse text-red-400 dark:text-red-500"
                : "text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            }`}
            title="Revert to template default"
          >
            {isDeleting ? "…" : "Revert"}
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
