"use client";

import { useState, useTransition } from "react";
import { brlFormatter, dateFormatter } from "@/helpers/format";
import {
  toggleBillPaid,
  updateBillInstanceAmount,
} from "../../actions";
import type { BillRow } from "../../_types";

type Props = {
  instance: BillRow;
  year: number;
  month: number;
  locked: boolean;
  highlightedDay: number | null;
  readOnly?: boolean;
  attribution?: string;
};

export default function BillInstanceRow({
  instance,
  year,
  month,
  locked,
  highlightedDay,
  readOnly,
  attribution,
}: Props) {
  // readOnly entries belong to a different space (another member's
  // personal space viewed through the shared-space aggregate). They
  // render with an attribution label and no edit/toggle controls —
  // same visual treatment as locked rows.
  const noEdit = locked || !!readOnly;
  const [editing, setEditing] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const progress = instance.installmentProgress;
  const isInstallment = progress != null;

  // For an unpaid installment bill, the user can choose how many
  // installments this single payment covers (default 1, capped at the
  // template's remaining). Paid instances render their stored coverage
  // directly and skip this input.
  const [coverInput, setCoverInput] = useState(1);

  // Parse the due day directly from the YYYY-MM-DD string so we don't
  // hit the UTC timezone trap that plagues new Date("YYYY-MM-DD").
  const dueDay = instance.due_date
    ? parseInt(instance.due_date.split("-")[2], 10)
    : null;
  const isHighlighted =
    highlightedDay !== null && dueDay !== null && dueDay === highlightedDay;

  const [isToggling, startToggle] = useTransition();
  const handleTogglePaid = (coveredOverride?: number) => {
    startToggle(async () => {
      const covered = coveredOverride ?? coverInput;
      await toggleBillPaid(
        instance.id,
        !instance.paid,
        instance.paid ? 1 : covered,
        new FormData()
      );
    });
  };

  // Update is invoked via useTransition rather than useActionState so we
  // can close edit mode in the success branch of the click handler — no
  // useEffect / setState-in-effect anti-pattern.
  const [isUpdating, startUpdate] = useTransition();
  const handleUpdate = (formData: FormData) => {
    startUpdate(async () => {
      const result = await updateBillInstanceAmount(
        instance.id,
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

  // Progress badge math: X/Y paid. For a paid prepaid instance we show
  // the instance's coverage alongside the overall progress ("×3") so the
  // user can tell which payment absorbed the extra installments.
  const progressBadge = progress ? `${progress.paid}/${progress.total}` : null;
  const showCoverInput =
    isInstallment &&
    !instance.paid &&
    !noEdit &&
    progress != null &&
    progress.remaining > 1;
  const maxCover = progress?.remaining ?? 1;

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
          <span>{instance.name}</span>
          {progressBadge && (
            <span
              className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200"
              title="Installments paid / total"
            >
              {progressBadge}
            </span>
          )}
          {instance.paid && instance.installments_covered > 1 && (
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
              ×{instance.installments_covered} this month
            </span>
          )}
        </p>
        {instance.due_date && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Due {dateFormatter.format(new Date(instance.due_date))}
          </p>
        )}
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
              defaultValue={String(instance.amount)}
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
              {brlFormatter.format(Number(instance.amount))}
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
              instance.paid
                ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200"
            }`}
          >
            {instance.paid ? "paid" : "pending"}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => handleTogglePaid()}
            disabled={isToggling}
            className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
              isToggling
                ? "animate-pulse bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                : instance.paid
                  ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-200 dark:hover:bg-green-900/60"
                  : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-200 dark:hover:bg-yellow-900/60"
            }`}
            title={instance.paid ? "Mark as pending" : "Mark as paid"}
          >
            {isToggling ? "…" : instance.paid ? "paid" : "pending"}
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
