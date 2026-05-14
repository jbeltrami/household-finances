"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import { billsUrl } from "@/helpers/paths";
import IconPicker from "@/components/IconPicker/IconPicker";
import { updateBillTemplate } from "../../../../actions";
import { initialFormState } from "../../../../form-state";

const DAY_OPTIONS = [
  { value: "0", label: "Dom" },
  { value: "1", label: "Seg" },
  { value: "2", label: "Ter" },
  { value: "3", label: "Qua" },
  { value: "4", label: "Qui" },
  { value: "5", label: "Sex" },
  { value: "6", label: "Sáb" },
];

type Template = {
  id: string;
  name: string;
  default_amount: number | string;
  category: string | null;
  icon: string | null;
  due_day: number | null;
  cadence: string | null;
  day_of_week: number | null;
  installments_total: number | null;
  installments_start_month: string | null;
};

type Props = {
  template: Template;
};

export default function EditBillTemplateForm({ template }: Props) {
  const [cadence, setCadence] = useState(template.cadence ?? "monthly");
  const [installmentsEnabled, setInstallmentsEnabled] = useState(
    template.installments_total != null
  );

  const boundAction = updateBillTemplate.bind(null, template.id);
  const [state, formAction, isPending] = useActionState(
    boundAction,
    initialFormState
  );

  return (
    <Card className="p-5">
      <form action={formAction}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label htmlFor="name" className="field-label">Nome</label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={template.name}
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
              defaultValue={template.default_amount}
              className="field-input"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="field-label">Ícone (opcional)</label>
            <IconPicker defaultValue={template.icon} />
            <p className="mt-1 text-xs text-muted">
              A categoria da conta é definida pelo ícone (Moradia, Saúde, etc.) —
              usada para agrupar relatórios.
            </p>
          </div>

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
                defaultValue={template.due_day ?? ""}
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
                defaultValue={
                  template.day_of_week != null
                    ? String(template.day_of_week)
                    : "0"
                }
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
                    defaultValue={template.installments_total ?? ""}
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
                    defaultValue={
                      template.installments_start_month?.slice(0, 7) ?? ""
                    }
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

        <p className="mt-3 text-xs text-muted">
          Alterações no valor padrão se aplicam automaticamente a todas as
          ocorrências ainda não pagas, já que elas são calculadas a partir do
          modelo em tempo real. Lançamentos já pagos ou com valor sobrescrito
          mantêm os valores salvos.
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <Link href={billsUrl()} className="btn-ghost">
            Cancelar
          </Link>
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>
      </form>
    </Card>
  );
}
