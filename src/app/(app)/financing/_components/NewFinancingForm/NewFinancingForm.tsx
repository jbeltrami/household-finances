"use client";

import { useActionState, useMemo, useState } from "react";
import Card from "@/components/Card";
import { brlFormatter } from "@/helpers/format";
import { todayYmd } from "@/helpers/date";
import {
  buildSchedule,
  type AmortizationSystem,
  type RatePeriod,
  type Schedule,
} from "@/helpers/amortization";
import { createFinancing } from "../../actions";
import { initialFormState } from "../../form-state";
import AmortizationTable from "../AmortizationTable/AmortizationTable";
import CurrencyInput from "../CurrencyInput/CurrencyInput";

type FormValues = {
  name: string;
  principal: string;
  interestRate: string;
  ratePeriod: RatePeriod;
  system: AmortizationSystem;
  startDate: string;
  installments: string;
};

// Build a preview schedule from the current form values, or null if they're
// not yet a valid simulation.
function previewSchedule(v: FormValues): Schedule | null {
  const principal = Number(v.principal);
  const rate = Number(v.interestRate);
  const installments = Number(v.installments);
  if (!Number.isFinite(principal) || principal <= 0) return null;
  if (!Number.isFinite(rate) || rate < 0) return null;
  if (!Number.isInteger(installments) || installments <= 0) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.startDate)) return null;
  if (installments > 1200) return null; // guard against runaway tables
  try {
    return buildSchedule({
      principal,
      ratePercent: rate,
      ratePeriod: v.ratePeriod,
      system: v.system,
      startDate: v.startDate,
      installments,
    });
  } catch {
    return null;
  }
}

export default function NewFinancingForm() {
  const [state, formAction, isPending] = useActionState(
    createFinancing,
    initialFormState
  );

  const [values, setValues] = useState<FormValues>({
    name: "",
    principal: "",
    interestRate: "",
    ratePeriod: "annual",
    system: "price",
    startDate: todayYmd(),
    installments: "",
  });

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const schedule = useMemo(() => previewSchedule(values), [values]);
  const firstPayment = schedule?.rows[0]?.payment ?? null;

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <form action={formAction}>
          <h2 className="text-base font-medium text-fg">Dados do financiamento</h2>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="name" className="field-label">
                Nome
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="ex.: Apartamento"
                value={values.name}
                onChange={(e) => set("name", e.target.value)}
                className="field-input"
              />
            </div>

            <div>
              <label htmlFor="principal" className="field-label">
                Valor do financiamento
              </label>
              <CurrencyInput
                id="principal"
                value={values.principal}
                onChange={(raw) => set("principal", raw)}
                placeholder="0,00"
              />
              {/* Submit the raw dot-decimal value so the action parses it as-is. */}
              <input type="hidden" name="principal" value={values.principal} />
            </div>

            <div>
              <label htmlFor="start_date" className="field-label">
                Data de início
              </label>
              <input
                id="start_date"
                name="start_date"
                type="date"
                required
                value={values.startDate}
                onChange={(e) => set("startDate", e.target.value)}
                className="field-input"
              />
            </div>

            <div>
              <label htmlFor="amortization_system" className="field-label">
                Sistema de amortização
              </label>
              <select
                id="amortization_system"
                name="amortization_system"
                value={values.system}
                onChange={(e) =>
                  set("system", e.target.value as AmortizationSystem)
                }
                className="field-input"
              >
                <option value="price">Tabela Price (parcela fixa)</option>
                <option value="sac">SAC (parcela decrescente)</option>
              </select>
            </div>

            <div>
              <label htmlFor="installments_total" className="field-label">
                Quantidade de parcelas
              </label>
              <input
                id="installments_total"
                name="installments_total"
                type="number"
                min="1"
                step="1"
                required
                placeholder="ex.: 360"
                value={values.installments}
                onChange={(e) => set("installments", e.target.value)}
                className="field-input"
              />
            </div>

            <div>
              <label htmlFor="interest_rate" className="field-label">
                Taxa de juros (%)
              </label>
              <input
                id="interest_rate"
                name="interest_rate"
                type="number"
                min="0"
                step="0.0001"
                required
                placeholder="ex.: 9.5"
                value={values.interestRate}
                onChange={(e) => set("interestRate", e.target.value)}
                className="field-input"
              />
            </div>

            <div>
              <label htmlFor="rate_period" className="field-label">
                Período da taxa
              </label>
              <select
                id="rate_period"
                name="rate_period"
                value={values.ratePeriod}
                onChange={(e) => set("ratePeriod", e.target.value as RatePeriod)}
                className="field-input"
              >
                <option value="annual">Ao ano (a.a.)</option>
                <option value="monthly">Ao mês (a.m.)</option>
              </select>
            </div>
          </div>

          {state.error && (
            <p className="mt-3 text-sm text-danger" role="alert">
              {state.error}
            </p>
          )}

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={isPending || !schedule}
              className="btn-primary"
            >
              {isPending ? "Salvando…" : "Salvar como meu financiamento"}
            </button>
          </div>
        </form>
      </Card>

      {schedule && (
        <Card className="p-5">
          <h2 className="text-base font-medium text-fg">Simulação</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              label={values.system === "sac" ? "1ª parcela" : "Parcela"}
              value={firstPayment != null ? brlFormatter.format(firstPayment) : "—"}
            />
            <Stat label="Parcelas" value={String(schedule.rows.length)} />
            <Stat
              label="Total de juros"
              value={brlFormatter.format(schedule.totals.interest)}
            />
            <Stat
              label="Total pago"
              value={brlFormatter.format(schedule.totals.paid)}
            />
          </div>

          <div className="mt-4">
            <AmortizationTable schedule={schedule} />
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-subtle bg-surface-2 px-3 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 font-mono text-sm tabular-nums text-fg">{value}</p>
    </div>
  );
}
