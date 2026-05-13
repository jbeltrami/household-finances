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
      className="rounded-xl border border-subtle bg-surface-2 p-4"
    >
      <h3 className="text-sm font-medium text-fg">Adicionar receita</h3>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="income_name" className="field-label">
            Nome
          </label>
          <input
            id="income_name"
            name="name"
            type="text"
            required
            placeholder="ex.: Salário, Freelance"
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="income_amount" className="field-label">
            Valor (BRL)
          </label>
          <input
            id="income_amount"
            name="amount"
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="0.00"
            className="field-input"
          />
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
