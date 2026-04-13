"use client";

import { useState } from "react";
import CreateOneOffExpenseForm from "../CreateOneOffExpenseForm/CreateOneOffExpenseForm";
import ExpenseEntryRow from "../ExpenseEntryRow/ExpenseEntryRow";
import { brlFormatter } from "@/helpers/format";
import type { ExpensesGroup } from "../../_types";

type Props = {
  expenses: ExpensesGroup;
  monthId: string;
  year: number;
  month: number;
  locked: boolean;
  highlightedDay: number | null;
};

export default function ExpensesSection({
  expenses,
  monthId,
  year,
  month,
  locked,
  highlightedDay,
}: Props) {
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">
          Expenses
        </h2>
        {!locked && (
          <button
            type="button"
            onClick={() => setShowAddForm((s) => !s)}
            aria-label={showAddForm ? "Cancel adding expense" : "Add expense"}
            aria-expanded={showAddForm}
            className="flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          >
            {showAddForm ? "×" : "+"}
          </button>
        )}
      </div>

      {!locked && showAddForm && (
        <CreateOneOffExpenseForm
          monthId={monthId}
          year={year}
          month={month}
          onSuccess={() => setShowAddForm(false)}
        />
      )}

      {expenses.entries.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          No one-off expenses recorded for this month.
        </p>
      ) : (
        <>
          <ul className="mt-2 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
            {expenses.entries.map((expense) => (
              <ExpenseEntryRow
                key={expense.id}
                expense={expense}
                year={year}
                month={month}
                locked={locked}
                highlightedDay={highlightedDay}
              />
            ))}
          </ul>

          <dl className="mt-4 rounded-lg border border-gray-200 bg-white p-4 text-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-baseline justify-between">
              <dt className="text-xs text-gray-500 dark:text-gray-400">
                Total expenses
              </dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">
                {brlFormatter.format(expenses.total)}
              </dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
}
