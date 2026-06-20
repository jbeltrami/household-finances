"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import CurrencyInput from "@/components/CurrencyInput/CurrencyInput";
import Collapsible from "@/components/Collapsible/Collapsible";
import { brlFormatter } from "@/helpers/format";
import { addMonthsToYmd, todayYmd } from "@/helpers/date";
import { setInstallmentPaid } from "../../actions";
import {
  buildSchedule,
  type AmortizationInput,
  type ExtraPaymentEffect,
  type ExtraPaymentInput,
  type Schedule,
} from "@/helpers/amortization";
import AmortizationTable from "../AmortizationTable/AmortizationTable";
import { effectLabel, formatYmd } from "../../_helpers";

type Props = {
  financingId: string;
  input: AmortizationInput;
  recordedExtras: ExtraPaymentInput[];
  paidNumbers: number[];
};

type TabKey = "initial" | "current" | "simulated";

type OneOff = {
  id: number;
  amount: string; // raw dot-decimal
  date: string;
  effect: ExtraPaymentEffect;
};

type Recurring = {
  enabled: boolean;
  amount: string;
  startDate: string;
  effect: ExtraPaymentEffect;
};

const YMD = /^\d{4}-\d{2}-\d{2}$/;

// Per-dataset accent so the same color reads consistently in the comparison
// card and the tabs: Inicial = neutral, Atual = foreground, Simulado = accent.
const TONE: Record<TabKey, string> = {
  initial: "text-muted",
  current: "text-fg",
  simulated: "text-accent",
};

function EffectRadios({
  name,
  value,
  onChange,
}: {
  name: string;
  value: ExtraPaymentEffect;
  onChange: (e: ExtraPaymentEffect) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:gap-4">
      {(["reduce_term", "reduce_installment"] as const).map((eff) => (
        <label key={eff} className="flex items-center gap-2 text-sm text-fg">
          <input
            type="radio"
            name={name}
            checked={value === eff}
            onChange={() => onChange(eff)}
          />
          <span>{effectLabel(eff)}</span>
        </label>
      ))}
    </div>
  );
}

export default function AmortizationSimulator({
  financingId,
  input,
  recordedExtras,
  paidNumbers,
}: Props) {
  const paidSet = useMemo(() => new Set(paidNumbers), [paidNumbers]);

  // Marking installments paid (incl. backfilling past months) from the
  // "Atual" tab. Revalidation refreshes paidNumbers from the server.
  const [isTogglingPaid, startTogglePaid] = useTransition();
  const handleTogglePaid = (
    installmentNumber: number,
    date: string,
    newPaid: boolean
  ) => {
    startTogglePaid(async () => {
      await setInstallmentPaid(financingId, installmentNumber, date, newPaid);
    });
  };

  const [oneOffs, setOneOffs] = useState<OneOff[]>([]);
  const [nextId, setNextId] = useState(1);
  const [draft, setDraft] = useState<{
    amount: string;
    date: string;
    effect: ExtraPaymentEffect;
  }>({ amount: "", date: todayYmd(), effect: "reduce_term" });
  const [recurring, setRecurring] = useState<Recurring>({
    enabled: false,
    amount: "",
    startDate: todayYmd(),
    effect: "reduce_term",
  });
  const [tab, setTab] = useState<TabKey>("current");

  // Hypothetical extras: the one-off list plus the recurring knob expanded to
  // one payment per month (the engine ignores any that fall after payoff).
  const simExtras = useMemo<ExtraPaymentInput[]>(() => {
    const list: ExtraPaymentInput[] = [];
    for (const o of oneOffs) {
      const amount = Number(o.amount);
      if (amount > 0 && YMD.test(o.date)) {
        list.push({ date: o.date, amount, effect: o.effect });
      }
    }
    if (recurring.enabled) {
      const amount = Number(recurring.amount);
      if (amount > 0 && YMD.test(recurring.startDate)) {
        for (let m = 0; m < input.installments; m++) {
          list.push({
            date: addMonthsToYmd(recurring.startDate, m),
            amount,
            effect: recurring.effect,
          });
        }
      }
    }
    return list;
  }, [oneOffs, recurring, input.installments]);

  // Three datasets: the original plan, the plan with recorded amortizações,
  // and (when simulating) that plus the hypothetical payments.
  const initial = useMemo(() => buildSchedule(input, []), [input]);
  const current = useMemo(
    () => buildSchedule(input, recordedExtras),
    [input, recordedExtras]
  );
  const simulated = useMemo(
    () => buildSchedule(input, [...recordedExtras, ...simExtras]),
    [input, recordedExtras, simExtras]
  );

  const hasSim = simExtras.length > 0;

  const columns: { key: TabKey; label: string; schedule: Schedule }[] = [
    { key: "initial", label: "Inicial", schedule: initial },
    { key: "current", label: "Atual", schedule: current },
    ...(hasSim
      ? [{ key: "simulated" as const, label: "Simulado", schedule: simulated }]
      : []),
  ];

  // Selected tab, falling back to "current" if the simulated tab vanished.
  const active = columns.find((c) => c.key === tab) ?? columns[1];

  const addOneOff = () => {
    if (!(Number(draft.amount) > 0) || !YMD.test(draft.date)) return;
    setOneOffs((list) => [
      ...list,
      { id: nextId, amount: draft.amount, date: draft.date, effect: draft.effect },
    ]);
    setNextId((n) => n + 1);
    setDraft({ amount: "", date: todayYmd(), effect: "reduce_term" });
  };

  const clearAll = () => {
    setOneOffs([]);
    setRecurring({
      enabled: false,
      amount: "",
      startDate: todayYmd(),
      effect: "reduce_term",
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Controls */}
      <Collapsible
        title="Simular pagamentos futuros"
        description="Apenas simulação — nada é salvo. Os pagamentos abaixo são somados às amortizações já registradas."
      >
        {/* One-off draft */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <div>
            <label className="field-label">Valor</label>
            <CurrencyInput
              value={draft.amount}
              onValueChange={(raw) => setDraft((d) => ({ ...d, amount: raw }))}
            />
          </div>
          <div>
            <label className="field-label">Data</label>
            <input
              type="date"
              value={draft.date}
              onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
              className="field-input"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={addOneOff}
              disabled={!(Number(draft.amount) > 0)}
              className="btn-primary inline-flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              Adicionar
            </button>
          </div>
        </div>
        <div className="mt-2">
          <EffectRadios
            name="draft_effect"
            value={draft.effect}
            onChange={(eff) => setDraft((d) => ({ ...d, effect: eff }))}
          />
        </div>

        {/* One-off list */}
        {oneOffs.length > 0 && (
          <ul className="mt-3 divide-y divide-subtle rounded-lg border border-subtle bg-surface">
            {oneOffs.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <span className="font-mono tabular-nums text-fg">
                  {brlFormatter.format(Number(o.amount))}
                </span>
                <span className="flex-1 text-xs text-muted">
                  {formatYmd(o.date)} · {effectLabel(o.effect)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setOneOffs((list) => list.filter((x) => x.id !== o.id))
                  }
                  aria-label="Remover pagamento simulado"
                  className="btn-danger-ghost"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Recurring monthly */}
        <div className="mt-4 border-t border-subtle pt-3">
          <label className="flex items-center gap-2 text-sm text-fg">
            <input
              type="checkbox"
              checked={recurring.enabled}
              onChange={(e) =>
                setRecurring((r) => ({ ...r, enabled: e.target.checked }))
              }
            />
            <span>Extra mensal fixo</span>
          </label>

          {recurring.enabled && (
            <div className="mt-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="field-label">Valor por mês</label>
                  <CurrencyInput
                    value={recurring.amount}
                    onValueChange={(raw) =>
                      setRecurring((r) => ({ ...r, amount: raw }))
                    }
                  />
                </div>
                <div>
                  <label className="field-label">A partir de</label>
                  <input
                    type="date"
                    value={recurring.startDate}
                    onChange={(e) =>
                      setRecurring((r) => ({ ...r, startDate: e.target.value }))
                    }
                    className="field-input"
                  />
                </div>
              </div>
              <div className="mt-2">
                <EffectRadios
                  name="recurring_effect"
                  value={recurring.effect}
                  onChange={(eff) =>
                    setRecurring((r) => ({ ...r, effect: eff }))
                  }
                />
              </div>
            </div>
          )}
        </div>
      </Collapsible>

      {/* Comparison summary — always shows Inicial vs Atual, + Simulado when active */}
      <ComparisonSummary
        columns={columns}
        initial={initial}
        current={current}
        simulated={hasSim ? simulated : null}
        onClear={hasSim ? clearAll : undefined}
      />

      {/* Tabs + the selected schedule */}
      <div>
        <div
          className="flex gap-1 border-b border-subtle"
          role="tablist"
          aria-label="Tabelas de amortização"
        >
          {columns.map((c) => {
            const selected = c.key === active.key;
            return (
              <button
                key={c.key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(c.key)}
                className={
                  "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors " +
                  (selected
                    ? `border-accent ${TONE[c.key]}`
                    : "border-transparent text-muted hover:text-fg")
                }
              >
                {c.label}
              </button>
            );
          })}
        </div>
        <div className="mt-3">
          <AmortizationTable
            schedule={active.schedule}
            paidNumbers={paidSet}
            onTogglePaid={
              active.key === "current" ? handleTogglePaid : undefined
            }
            togglePending={isTogglingPaid}
          />
          {active.key === "current" && (
            <p className="mt-2 text-xs text-muted">
              Clique em “Pendente”/“Pago” para registrar parcelas — inclusive
              meses passados, ao cadastrar um financiamento já em andamento.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function payoffDate(s: Schedule): string {
  const last = s.rows[s.rows.length - 1];
  return last ? formatYmd(last.date) : "—";
}

function ComparisonSummary({
  columns,
  initial,
  current,
  simulated,
  onClear,
}: {
  columns: { key: TabKey; label: string; schedule: Schedule }[];
  initial: Schedule;
  current: Schedule;
  simulated: Schedule | null;
  onClear?: () => void;
}) {
  const metrics: { label: string; value: (s: Schedule) => string }[] = [
    { label: "Parcelas", value: (s) => String(s.rows.length) },
    {
      label: "Total de juros",
      value: (s) => brlFormatter.format(s.totals.interest),
    },
    {
      label: "Total pago",
      value: (s) => brlFormatter.format(s.totals.paid),
    },
    { label: "Quitação", value: (s) => payoffDate(s) },
  ];

  // Headline delta: simulated-vs-current when simulating, else current-vs-initial.
  const target = simulated ?? current;
  const reference = simulated ? current : initial;
  const monthsSaved = reference.rows.length - target.rows.length;
  const interestSaved = reference.totals.interest - target.totals.interest;
  const lead = simulated ? "Com a simulação" : "Até agora";

  let delta: string;
  if (monthsSaved === 0 && Math.abs(interestSaved) < 0.01) {
    delta = simulated
      ? "A simulação não altera o plano."
      : "Você está seguindo o plano inicial.";
  } else {
    const months =
      monthsSaved > 0
        ? `quita ${monthsSaved} ${monthsSaved === 1 ? "parcela" : "parcelas"} antes`
        : monthsSaved < 0
          ? `${-monthsSaved} parcelas a mais`
          : "mesmo prazo";
    const interest =
      Math.abs(interestSaved) >= 0.01
        ? ` · ${interestSaved > 0 ? "economia" : "acréscimo"} de ${brlFormatter.format(Math.abs(interestSaved))} em juros`
        : "";
    delta = `${lead}: ${months}${interest}`;
  }

  return (
    <div className="rounded-xl border border-subtle bg-surface p-4">
      {onClear && (
        <div className="mb-2 flex justify-end">
          <button type="button" onClick={onClear} className="btn-ghost text-xs">
            Limpar simulação
          </button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th />
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`pb-1 text-right text-xs font-medium uppercase tracking-wide ${TONE[c.key]}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <tr key={m.label}>
                <td className="py-0.5 text-muted">{m.label}</td>
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`py-0.5 text-right font-mono tabular-nums ${TONE[c.key]}`}
                  >
                    {m.value(c.schedule)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 border-t border-subtle pt-3 text-sm text-fg">{delta}</p>
    </div>
  );
}
