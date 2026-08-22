"use client";

import { useRef, useState, useTransition } from "react";
import CurrencyInput from "@/components/CurrencyInput/CurrencyInput";
import { defaultEntryDate } from "@/helpers/date";
import { createIncomeEntry } from "../../actions";
import CategorySelect from "@/components/CategorySelect/CategorySelect";
import PayerSelect from "@/components/PayerSelect/PayerSelect";
import type { CategoryRow, PayerRow } from "@/helpers/taxonomy";

type Props = {
  categories: CategoryRow[];
  payers: PayerRow[];
  year: number;
  month: number;
  onSuccess?: () => void;
};

export default function CreateIncomeEntryForm({
  categories,
  payers,
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

  // Default to today when viewing the current month, otherwise the first
  // of the viewed month (so the entry stays visible on this page).
  const defaultDate = defaultEntryDate(year, month);

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="rounded-xl border border-subtle bg-surface-2 p-4"
    >
      <h3 className="text-sm font-medium text-fg">Adicionar receita</h3>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="income_name" className="field-label">
            Descrição (opcional)
          </label>
          <input
            id="income_name"
            name="name"
            type="text"
            placeholder="ex.: Venda da bicicleta"
            className="field-input"
          />
          <p className="mt-1 text-xs text-muted">
            Deixe em branco e a receita aparece como pagador e categoria.
          </p>
        </div>
        <div>
          <label htmlFor="income_payer" className="field-label">
            Pagador (opcional)
          </label>
          <PayerSelect id="income_payer" payers={payers} />
        </div>

        <div>
          <label htmlFor="income_category" className="field-label">
            Categoria (opcional)
          </label>
          <CategorySelect id="income_category" categories={categories} />
        </div>

        <div>
          <label htmlFor="income_amount" className="field-label">
            Valor
          </label>
          <CurrencyInput id="income_amount" name="amount" required />
        </div>
        <div className="sm:col-span-3">
          <label htmlFor="income_expected_date" className="field-label">
            Data esperada
          </label>
          <input
            id="income_expected_date"
            name="expected_date"
            type="date"
            required
            defaultValue={defaultDate}
            className="field-input"
          />
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? "Adicionando…" : "Adicionar"}
        </button>
      </div>
    </form>
  );
}
