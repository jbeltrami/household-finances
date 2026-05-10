"use client";

import { useState } from "react";
import CreateOneOffExpenseForm from "../CreateOneOffExpenseForm/CreateOneOffExpenseForm";
import ExpenseEntryRow from "../ExpenseEntryRow/ExpenseEntryRow";
import { brlFormatter } from "@/helpers/format";
import type { ExpensesGroup } from "../../_types";

type Props = {
  expenses: ExpensesGroup;
  spaceId: string;
  year: number;
  month: number;
  locked: boolean;
  highlightedDay: number | null;
};

// Key helper: one-off entries always have an id (they're materialized
// by creation), so no virtual fallback needed here.
export default function ExpensesSection({
  expenses,
  spaceId,
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
          Despesas
        </h2>
        {!locked && (
          <button
            type="button"
            onClick={() => setShowAddForm((s) => !s)}
            aria-label={showAddForm ? "Cancelar adição de despesa" : "Adicionar despesa"}
            aria-expanded={showAddForm}
            className="flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          >
            {showAddForm ? "×" : "+"}
          </button>
        )}
      </div>

      {!locked && showAddForm && (
        <CreateOneOffExpenseForm
          spaceId={spaceId}
          year={year}
          month={month}
          onSuccess={() => setShowAddForm(false)}
        />
      )}

      {expenses.entries.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Nenhuma despesa avulsa registrada neste mês.
        </p>
      ) : (
        <>
          <ul className="mt-2 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
            {expenses.entries.map((expense) => (
              <ExpenseEntryRow
                key={expense.id!}
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
                Total de despesas
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
