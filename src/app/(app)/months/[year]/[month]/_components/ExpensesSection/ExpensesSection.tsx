"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import Card from "@/components/Card";
import CreateOneOffExpenseForm from "../CreateOneOffExpenseForm/CreateOneOffExpenseForm";
import ExpenseEntryRow from "../ExpenseEntryRow/ExpenseEntryRow";
import { brlFormatter } from "@/helpers/format";
import type { ExpensesGroup } from "../../_types";

type Props = {
  expenses: ExpensesGroup;
  year: number;
  month: number;
  locked: boolean;
  highlightedDay: number | null;
};

export default function ExpensesSection({
  expenses,
  year,
  month,
  locked,
  highlightedDay,
}: Props) {
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-medium text-fg">Despesas</h2>
          <p className="mt-1 text-3xl font-bold text-danger">
            {brlFormatter.format(expenses.total)}
          </p>
        </div>
        {!locked && (
          <button
            type="button"
            onClick={() => setShowAddForm((s) => !s)}
            aria-label={
              showAddForm ? "Cancelar adição de despesa" : "Adicionar despesa"
            }
            data-tooltip={showAddForm ? "Cancelar" : "Adicionar despesa"}
            aria-expanded={showAddForm}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
          >
            {showAddForm ? (
              <X className="h-5 w-5" strokeWidth={2} />
            ) : (
              <Plus className="h-5 w-5" strokeWidth={2} />
            )}
          </button>
        )}
      </div>

      {!locked && showAddForm && (
        <div className="mt-4">
          <CreateOneOffExpenseForm
            year={year}
            month={month}
            onSuccess={() => setShowAddForm(false)}
          />
        </div>
      )}

      {expenses.entries.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          Nenhuma despesa avulsa registrada neste mês.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-subtle">
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
      )}
    </Card>
  );
}
