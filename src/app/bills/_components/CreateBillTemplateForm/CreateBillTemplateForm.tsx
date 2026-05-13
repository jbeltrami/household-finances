"use client";

import { useActionState, useState } from "react";
import Card from "@/components/Card";
import { createBillTemplate } from "../../actions";
import { initialFormState } from "../../form-state";
import IconPicker from "@/components/IconPicker/IconPicker";

const DAY_OPTIONS = [
  { value: "0", label: "Dom" },
  { value: "1", label: "Seg" },
  { value: "2", label: "Ter" },
  { value: "3", label: "Qua" },
  { value: "4", label: "Qui" },
  { value: "5", label: "Sex" },
  { value: "6", label: "Sáb" },
];

type Props = {
  spaceId: string;
};

// Default start for an installment — the current month, in YYYY-MM form
// so it flows straight into <input type="month">.
function currentMonthValue(): string {
  const now = new Date();
  return `${String(now.getFullYear()).padStart(4, "0")}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;
}

export default function CreateBillTemplateForm({ spaceId }: Props) {
  const [cadence, setCadence] = useState("monthly");
  const [installmentsEnabled, setInstallmentsEnabled] = useState(false);
  const [state, formAction, isPending] = useActionState(
    createBillTemplate,
    initialFormState
  );

  return (
    <Card className="p-5">
      <form action={formAction}>
        <input type="hidden" name="space_id" value={spaceId} />
        <h2 className="text-base font-medium text-fg">Adicionar conta recorrente</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label htmlFor="name" className="field-label">Nome</label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="ex.: Claro"
              className="field-input"
            />
          </div>
          <div>
            <label htmlFor="default_amount" className="field-label">
              Valor padrão (BRL)
            </label>
            <input
              id="default_amount"
              name="default_amount"
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="0.00"
              className="field-input"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="field-label">Ícone (opcional)</label>
            <IconPicker />
            <p className="mt-1 text-xs text-muted">
              A categoria da conta é definida pelo ícone (Moradia, Saúde, etc.) —
              usada para agrupar relatórios.
            </p>
          </div>

          {/* Cadence picker */}
          <div>
            <label htmlFor="cadence" className="field-label">Recorrência</label>
            <select
              id="cadence"
              name="cadence"
              value={cadence}
              onChange={(e) => setCadence(e.target.value)}
              className="field-input"
            >
              <option value="monthly">Mensal</option>
              <option value="weekly">Semanal</option>
              <option value="biweekly">Quinzenal</option>
            </select>
          </div>

          {cadence === "monthly" && (
            <div>
              <label htmlFor="due_day" className="field-label">
                Dia de vencimento (opcional)
              </label>
              <input
                id="due_day"
                name="due_day"
                type="number"
                min="1"
                max="31"
                placeholder="1–31"
                className="field-input"
              />
            </div>
          )}

          {cadence !== "monthly" && (
            <div>
              <label htmlFor="day_of_week" className="field-label">
                Dia da semana
              </label>
              <select
                id="day_of_week"
                name="day_of_week"
                required
                className="field-input"
              >
                {DAY_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {cadence === "monthly" && (
          <div className="mt-4 rounded-xl border border-subtle bg-surface-2 p-3">
            <label className="flex items-center gap-2 text-sm text-fg">
              <input
                type="checkbox"
                name="installments_enabled"
                checked={installmentsEnabled}
                onChange={(e) => setInstallmentsEnabled(e.target.checked)}
              />
              <span>Parcelamento (número limitado de parcelas mensais)</span>
            </label>

            {installmentsEnabled && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="installments_total" className="field-label">
                    Quantas parcelas?
                  </label>
                  <input
                    id="installments_total"
                    name="installments_total"
                    type="number"
                    min="1"
                    step="1"
                    required={installmentsEnabled}
                    placeholder="ex.: 10"
                    className="field-input"
                  />
                </div>
                <div>
                  <label
                    htmlFor="installments_start_month"
                    className="field-label"
                  >
                    Mês da primeira parcela
                  </label>
                  <input
                    id="installments_start_month"
                    name="installments_start_month"
                    type="month"
                    required={installmentsEnabled}
                    defaultValue={currentMonthValue()}
                    className="field-input"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {state.error && (
          <p className="mt-3 text-sm text-danger" role="alert">
            {state.error}
          </p>
        )}

        <div className="mt-4 flex justify-end">
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? "Adicionando…" : "Adicionar"}
          </button>
        </div>
      </form>
    </Card>
  );
}
