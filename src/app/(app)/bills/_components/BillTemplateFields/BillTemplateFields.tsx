"use client";

import { useState } from "react";
import IconPicker from "@/components/IconPicker/IconPicker";
import CurrencyInput from "@/components/CurrencyInput/CurrencyInput";
import type { CategoryRow } from "@/helpers/taxonomy";
import CategorySelect from "@/components/CategorySelect/CategorySelect";

const DAY_OPTIONS = [
  { value: "0", label: "Dom" },
  { value: "1", label: "Seg" },
  { value: "2", label: "Ter" },
  { value: "3", label: "Qua" },
  { value: "4", label: "Qui" },
  { value: "5", label: "Sex" },
  { value: "6", label: "Sáb" },
];

// Default start for an installment — the current month, in YYYY-MM form
// so it flows straight into <input type="month">.
function currentMonthValue(): string {
  const now = new Date();
  return `${String(now.getFullYear()).padStart(4, "0")}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;
}

export type BillTemplateFieldDefaults = {
  name?: string;
  defaultAmount?: number | string;
  icon?: string | null;
  // The whole Categoria, not just its id: the select needs the name to
  // render it when it has since been deactivated.
  category?: { id: string; name: string } | null;
  cadence?: string;
  dueDay?: number | null;
  dayOfWeek?: number | null;
  installmentsTotal?: number | null;
  installmentsStartMonth?: string | null;
};

type Props = {
  defaults?: BillTemplateFieldDefaults;
  // Active outflow Categorias, resolved by the page. Passed in rather than
  // fetched here because this is a client component and the list is the
  // same for every form on the page.
  categories: CategoryRow[];
};

export default function BillTemplateFields({ defaults, categories }: Props) {
  const [cadence, setCadence] = useState(defaults?.cadence ?? "monthly");
  const [installmentsEnabled, setInstallmentsEnabled] = useState(
    defaults?.installmentsTotal != null
  );

  const installmentsStartDefault =
    defaults?.installmentsStartMonth?.slice(0, 7) ?? currentMonthValue();

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="name" className="field-label">
            Nome
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="ex.: Claro"
            defaultValue={defaults?.name ?? ""}
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="default_amount" className="field-label">
            Valor padrão
          </label>
          <CurrencyInput
            id="default_amount"
            name="default_amount"
            required
            defaultValue={
              defaults?.defaultAmount != null
                ? String(defaults.defaultAmount)
                : ""
            }
          />
        </div>

        <div>
          <label htmlFor="category_id" className="field-label">
            Categoria (opcional)
          </label>
          <CategorySelect
            id="category_id"
            categories={categories}
            current={defaults?.category ?? null}
          />
          <p className="mt-1 text-xs text-muted">
            Agrupa a conta nos relatórios. Mudar a categoria move todo o
            histórico dela junto.
          </p>
        </div>

        <div className="sm:col-span-2">
          <label className="field-label">Ícone (opcional)</label>
          <IconPicker defaultValue={defaults?.icon ?? null} />
          <p className="mt-1 text-xs text-muted">
            Só aparência — independente da categoria. Sem ícone, a conta usa o
            da própria categoria.
          </p>
        </div>

        <div>
          <label htmlFor="cadence" className="field-label">
            Recorrência
          </label>
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
              defaultValue={defaults?.dueDay ?? ""}
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
                defaults?.dayOfWeek != null ? String(defaults.dayOfWeek) : "0"
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
                  placeholder="ex.: 10"
                  defaultValue={defaults?.installmentsTotal ?? ""}
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
                  defaultValue={installmentsStartDefault}
                  className="field-input"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
