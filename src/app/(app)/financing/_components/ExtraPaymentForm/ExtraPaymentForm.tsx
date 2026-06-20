"use client";

import { useActionState } from "react";
import { todayYmd } from "@/helpers/date";
import { addExtraPayment } from "../../actions";
import { initialFormState } from "../../form-state";

type Props = {
  financingId: string;
};

export default function ExtraPaymentForm({ financingId }: Props) {
  const [state, formAction, isPending] = useActionState(
    addExtraPayment,
    initialFormState
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="financing_id" value={financingId} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="extra_amount" className="field-label">
            Valor (BRL)
          </label>
          <input
            id="extra_amount"
            name="amount"
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="0.00"
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="extra_date" className="field-label">
            Data
          </label>
          <input
            id="extra_date"
            name="date"
            type="date"
            required
            defaultValue={todayYmd()}
            className="field-input"
          />
        </div>
      </div>

      <fieldset className="mt-3">
        <legend className="field-label">Efeito</legend>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:gap-6">
          <label className="flex items-center gap-2 text-sm text-fg">
            <input
              type="radio"
              name="effect"
              value="reduce_term"
              defaultChecked
            />
            <span>Reduzir prazo (quita antes)</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-fg">
            <input type="radio" name="effect" value="reduce_installment" />
            <span>Reduzir parcela (mantém o prazo)</span>
          </label>
        </div>
      </fieldset>

      <div className="mt-3">
        <label htmlFor="extra_notes" className="field-label">
          Observação (opcional)
        </label>
        <input
          id="extra_notes"
          name="notes"
          type="text"
          placeholder="ex.: FGTS"
          className="field-input"
        />
      </div>

      {state.error && (
        <p className="mt-3 text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? "Registrando…" : "Registrar amortização"}
        </button>
      </div>
    </form>
  );
}
