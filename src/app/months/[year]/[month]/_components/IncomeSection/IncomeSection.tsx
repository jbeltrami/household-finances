"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import Card from "@/components/Card";
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
};

export default function IncomeSection({
  income,
  spaceId,
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
          <h2 className="text-base font-medium text-fg">Receitas</h2>
          <p className="mt-1 text-3xl font-bold text-accent">
            {brlFormatter.format(income.total)}
          </p>
        </div>
        {!locked && (
          <button
            type="button"
            onClick={() => setShowAddForm((s) => !s)}
            aria-label={
              showAddForm ? "Cancelar adição de receita" : "Adicionar receita"
            }
            data-tooltip={showAddForm ? "Cancelar" : "Adicionar receita"}
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
          <CreateIncomeEntryForm
            spaceId={spaceId}
            year={year}
            month={month}
            onSuccess={() => setShowAddForm(false)}
          />
        </div>
      )}

      {income.entries.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          Nenhuma receita registrada neste mês.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-subtle">
          {income.entries.map((entry) => (
            <IncomeEntryRow
              key={entry.id}
              entry={entry}
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
