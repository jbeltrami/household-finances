"use client";

import { useActionState, useState } from "react";
import { createBillTemplate } from "../../actions";
import { initialFormState } from "../../form-state";

const DAY_OPTIONS = [
  { value: "0", label: "Dom" },
  { value: "1", label: "Seg" },
  { value: "2", label: "Ter" },
  { value: "3", label: "Qua" },
  { value: "4", label: "Qui" },
  { value: "5", label: "Sex" },
  { value: "6", label: "Sáb" },
];

type Props = {
  spaceId: string;
};

// Default start for an installment — the current month, in YYYY-MM form
// so it flows straight into <input type="month">.
function currentMonthValue(): string {
  const now = new Date();
  return `${String(now.getFullYear()).padStart(4, "0")}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;
}

export default function CreateBillTemplateForm({ spaceId }: Props) {
  const [cadence, setCadence] = useState("monthly");
  const [installmentsEnabled, setInstallmentsEnabled] = useState(false);
  const [state, formAction, isPending] = useActionState(
    createBillTemplate,
    initialFormState
  );

  return (
    <form
      action={formAction}
      className="mt-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
    >
      <input type="hidden" name="space_id" value={spaceId} />
      <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">
        Add a template
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
            placeholder="e.g. Claro"
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-500"
          />
        </div>
        <div>
          <label
            htmlFor="default_amount"
            className="block text-xs font-medium text-gray-700 dark:text-gray-300"
          >
            Default amount (BRL)
          </label>
          <input
            id="default_amount"
            name="default_amount"
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="0.00"
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-500"
          />
        </div>

        {/* Cadence picker */}
        <div>
          <label
            htmlFor="cadence"
            className="block text-xs font-medium text-gray-700 dark:text-gray-300"
          >
            Recurrence
          </label>
          <select
            id="cadence"
            name="cadence"
            value={cadence}
            onChange={(e) => setCadence(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-500"
          >
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
          </select>
        </div>

        {/* Monthly: due day */}
        {cadence === "monthly" && (
          <div>
            <label
              htmlFor="due_day"
              className="block text-xs font-medium text-gray-700 dark:text-gray-300"
            >
              Due day (optional)
            </label>
            <input
              id="due_day"
              name="due_day"
              type="number"
              min="1"
              max="31"
              placeholder="1–31"
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-500"
            />
          </div>
        )}

        {/* Weekly / Biweekly: day of week */}
        {cadence !== "monthly" && (
          <div>
            <label
              htmlFor="day_of_week"
              className="block text-xs font-medium text-gray-700 dark:text-gray-300"
            >
              Day
            </label>
            <select
              id="day_of_week"
              name="day_of_week"
              required
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-500"
            >
              {DAY_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {cadence === "monthly" && (
        <div className="mt-4 rounded-md border border-gray-200 p-3 dark:border-gray-700">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              name="installments_enabled"
              checked={installmentsEnabled}
              onChange={(e) => setInstallmentsEnabled(e.target.checked)}
            />
            <span>Parcelamento (bounded number of monthly installments)</span>
          </label>

          {installmentsEnabled && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="installments_total"
                  className="block text-xs font-medium text-gray-700 dark:text-gray-300"
                >
                  How many installments?
                </label>
                <input
                  id="installments_total"
                  name="installments_total"
                  type="number"
                  min="1"
                  step="1"
                  required={installmentsEnabled}
                  placeholder="e.g. 10"
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label
                  htmlFor="installments_start_month"
                  className="block text-xs font-medium text-gray-700 dark:text-gray-300"
                >
                  First installment month
                </label>
                <input
                  id="installments_start_month"
                  name="installments_start_month"
                  type="month"
                  required={installmentsEnabled}
                  defaultValue={currentMonthValue()}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {state.error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
        >
          {isPending ? "Adding…" : "Add template"}
        </button>
      </div>
    </form>
  );
}
