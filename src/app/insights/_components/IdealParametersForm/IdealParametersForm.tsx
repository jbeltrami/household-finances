"use client";

import { useActionState } from "react";
import Card from "@/components/Card";
import type { IdealSettings } from "@/helpers/types";
import { saveIdealBudget } from "../../actions";
import { initialFormState } from "../../form-state";

type Props = {
  initialSettings: IdealSettings;
};

// Fractions are stored 0–1 but edited as whole-number percentages.
function toPercent(fraction: number): number {
  return Math.round(fraction * 100 * 100) / 100;
}

export default function IdealParametersForm({ initialSettings }: Props) {
  const [state, formAction, isPending] = useActionState(
    saveIdealBudget,
    initialFormState
  );

  return (
    <Card className="p-5">
      <h2 className="text-base font-medium text-fg">Seus parâmetros</h2>
      <p className="mt-1 text-xs text-muted">
        Ajuste as metas para a sua realidade. Os valores padrão seguem
        recomendações comuns de finanças pessoais.
      </p>

      <form action={formAction} className="mt-4 flex flex-col gap-5">
        <fieldset>
          <legend className="text-xs font-medium uppercase tracking-wide text-muted">
            Metas mensais (% da renda)
          </legend>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="savings_rate" className="field-label">
                Poupança (%)
              </label>
              <input
                id="savings_rate"
                name="savings_rate"
                type="number"
                min="0"
                step="0.1"
                required
                defaultValue={toPercent(initialSettings.savings_rate)}
                className="field-input"
              />
            </div>
            <div>
              <label htmlFor="max_fixed_rate" className="field-label">
                Teto de gastos fixos (%)
              </label>
              <input
                id="max_fixed_rate"
                name="max_fixed_rate"
                type="number"
                min="0"
                step="0.1"
                required
                defaultValue={toPercent(initialSettings.max_fixed_rate)}
                className="field-input"
              />
            </div>
            <div>
              <label htmlFor="max_mortgage_rate" className="field-label">
                Teto de moradia (%)
              </label>
              <input
                id="max_mortgage_rate"
                name="max_mortgage_rate"
                type="number"
                min="0"
                step="0.1"
                required
                defaultValue={toPercent(initialSettings.max_mortgage_rate)}
                className="field-input"
              />
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-xs font-medium uppercase tracking-wide text-muted">
            Metas de patrimônio (sobre os gastos médios)
          </legend>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="emergency_months" className="field-label">
                Reserva de emergência (meses de gasto)
              </label>
              <input
                id="emergency_months"
                name="emergency_months"
                type="number"
                min="0"
                step="1"
                required
                defaultValue={initialSettings.emergency_months}
                className="field-input"
              />
            </div>
            <div>
              <label htmlFor="freedom_annual_mult" className="field-label">
                Independência (× gasto anual)
              </label>
              <input
                id="freedom_annual_mult"
                name="freedom_annual_mult"
                type="number"
                min="0"
                step="1"
                required
                defaultValue={initialSettings.freedom_annual_mult}
                className="field-input"
              />
            </div>
          </div>
        </fieldset>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? "Salvando…" : "Salvar parâmetros"}
          </button>
          {state.error && (
            <p className="text-sm text-danger" role="alert">
              {state.error}
            </p>
          )}
        </div>
      </form>
    </Card>
  );
}
