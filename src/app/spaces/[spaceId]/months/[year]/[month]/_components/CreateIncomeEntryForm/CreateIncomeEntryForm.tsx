"use client";

import { useRef, useState, useTransition } from "react";
import { createIncomeEntry } from "../../actions";

type Props = {
  spaceId: string;
  year: number;
  month: number;
  onSuccess?: () => void;
};

export default function CreateIncomeEntryForm({
  spaceId,
  year,
  month,
  onSuccess,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startSubmit] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (formData: FormData) => {
    startSubmit(async () => {
      const result = await createIncomeEntry(
        spaceId,
        year,
        month,
        { error: null },
        formData
      );
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        formRef.current?.reset();
        onSuccess?.();
      }
    });
  };

  // Default the expected-date to the first of the currently viewed
  // month so the entry lands here unless the user picks something else.
  const defaultDate = `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-01`;

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="mt-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
    >
      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
        Add income
      </h3>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label
            htmlFor="income_name"
            className="block text-xs font-medium text-gray-700 dark:text-gray-300"
          >
            Name
          </label>
          <input
            id="income_name"
            name="name"
            type="text"
            required
            placeholder="e.g. Paycheck, Freelance gig"
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-500"
          />
        </div>
        <div>
          <label
            htmlFor="income_amount"
            className="block text-xs font-medium text-gray-700 dark:text-gray-300"
          >
            Amount (BRL)
          </label>
          <input
            id="income_amount"
            name="amount"
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="0.00"
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-500"
          />
        </div>
        <div className="sm:col-span-3">
          <label
            htmlFor="income_expected_date"
            className="block text-xs font-medium text-gray-700 dark:text-gray-300"
          >
            Expected date
          </label>
          <input
            id="income_expected_date"
            name="expected_date"
            type="date"
            required
            defaultValue={defaultDate}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-500"
          />
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
        >
          {isPending ? "Adding…" : "Add income"}
        </button>
      </div>
    </form>
  );
}
