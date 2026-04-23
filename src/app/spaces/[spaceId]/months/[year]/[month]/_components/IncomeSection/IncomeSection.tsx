"use client";

import { useState } from "react";
import CreateIncomeEntryForm from "../CreateIncomeEntryForm/CreateIncomeEntryForm";
import IncomeEntryRow from "../IncomeEntryRow/IncomeEntryRow";
import { brlFormatter } from "@/helpers/format";
import type { IncomeGroup } from "../../_types";

type Props = {
  income: IncomeGroup;
  spaceId: string;
  year: number;
  month: number;
  locked: boolean;
  highlightedDay: number | null;
  attributions: Record<string, string>;
};

export default function IncomeSection({
  income,
  spaceId,
  year,
  month,
  locked,
  highlightedDay,
  attributions,
}: Props) {
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">
          Income
        </h2>
        {!locked && (
          <button
            type="button"
            onClick={() => setShowAddForm((s) => !s)}
            aria-label={showAddForm ? "Cancel adding income" : "Add income"}
            aria-expanded={showAddForm}
            className="flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          >
            {showAddForm ? "×" : "+"}
          </button>
        )}
      </div>

      {!locked && showAddForm && (
        <CreateIncomeEntryForm
          spaceId={spaceId}
          year={year}
          month={month}
          onSuccess={() => setShowAddForm(false)}
        />
      )}

      {income.entries.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          No income recorded for this month.
        </p>
      ) : (
        <>
          <ul className="mt-2 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
            {income.entries.map((entry) => (
              <IncomeEntryRow
                key={entry.id}
                entry={entry}
                year={year}
                month={month}
                locked={locked}
                highlightedDay={highlightedDay}
                readOnly={entry.space_id !== spaceId}
                attribution={attributions[entry.space_id]}
              />
            ))}
          </ul>

          <dl className="mt-4 grid grid-cols-3 gap-4 rounded-lg border border-gray-200 bg-white p-4 text-sm dark:border-gray-700 dark:bg-gray-800">
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">
                Total income
              </dt>
              <dd className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                {brlFormatter.format(income.total)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">
                Received so far
              </dt>
              <dd className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                {brlFormatter.format(income.received)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">
                Still expected
              </dt>
              <dd className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                {brlFormatter.format(income.stillExpected)}
              </dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
}
