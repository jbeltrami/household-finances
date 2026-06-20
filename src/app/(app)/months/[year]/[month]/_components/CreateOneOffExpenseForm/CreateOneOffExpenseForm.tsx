"use client";

import { useRef, useState, useTransition } from "react";
import IconPicker from "@/components/IconPicker/IconPicker";
import CurrencyInput from "@/components/CurrencyInput/CurrencyInput";
import { defaultEntryDate } from "@/helpers/date";
import { createOneOffEntry } from "../../actions";

type Props = {
  year: number;
  month: number;
  onSuccess?: () => void;
};

export default function CreateOneOffExpenseForm({
  year,
  month,
  onSuccess,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startSubmit] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (formData: FormData) => {
    startSubmit(async () => {
      const result = await createOneOffEntry(
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
      <h3 className="text-sm font-medium text-fg">Adicionar despesa</h3>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="expense_name" className="field-label">
            Nome
          </label>
          <input
            id="expense_name"
            name="name"
            type="text"
            required
            placeholder="ex.: Restaurante, Posto de gasolina"
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="expense_amount" className="field-label">
            Valor
          </label>
          <CurrencyInput id="expense_amount" name="amount" required />
        </div>
        <div>
          <label htmlFor="expense_date" className="field-label">
            Data
          </label>
          <input
            id="expense_date"
            name="date"
            type="date"
            required
            defaultValue={defaultDate}
            className="field-input"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label">Ícone (opcional)</label>
          <IconPicker />
        </div>
        <div className="sm:col-span-3">
          <label htmlFor="expense_notes" className="field-label">
            Observações (opcional)
          </label>
          <textarea
            id="expense_notes"
            name="notes"
            rows={2}
            placeholder="Algo que valha a pena lembrar sobre essa despesa"
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
