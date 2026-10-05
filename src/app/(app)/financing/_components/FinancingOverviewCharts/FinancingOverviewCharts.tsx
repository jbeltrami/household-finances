"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Card from "@/components/Card";
import { formatShortMonthYear } from "@/helpers/date";
import { brlCompactFormatter, brlFormatter } from "@/helpers/format";
import type { FinancingOverviewSeries } from "@/helpers/financing";

type Props = {
  series: FinancingOverviewSeries;
  currentMonth: string; // "YYYY-MM", where the "hoje" marker sits
};

type Month = FinancingOverviewSeries["months"][number];
type Measure = "balance" | "payment";

// A loan takes its colour from its position in the ledger, so it is the
// same in both charts. Four slots cover any household this app has seen; a
// fifth loan onward falls back to a neutral grey rather than repeating a
// colour another loan already owns.
const PALETTE = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
];
const OVERFLOW = "var(--color-muted)";

function colorAt(index: number): string {
  return PALETTE[index] ?? OVERFLOW;
}

// The two charts read the same months on the same axis: same data, same
// ticks, same fixed Y-axis width, so a month sits at the same horizontal
// position in both. They are the plan, not a record of past payments.
export default function FinancingOverviewCharts({ series, currentMonth }: Props) {
  if (series.months.length === 0) return null;

  return (
    <div className="mt-6 grid gap-4">
      <OverviewChart
        title="Saldo devedor"
        series={series}
        currentMonth={currentMonth}
        measure="balance"
      />
      {/* Bars were rejected here: 360 monthly bars smear at 1–2 px. */}
      <OverviewChart
        title="Parcelas por mês"
        series={series}
        currentMonth={currentMonth}
        measure="payment"
      />
    </div>
  );
}

function OverviewChart({
  title,
  series,
  currentMonth,
  measure,
}: Props & { title: string; measure: Measure }) {
  const { financings, months } = series;

  // A thirty-year span stays readable with a tick a year. A span that
  // never crosses a January still gets one, at its start.
  const januaries = months
    .map((m) => m.month)
    .filter((ym) => ym.endsWith("-01"));
  const ticks = januaries.length > 0 ? januaries : [months[0].month];

  const showToday = months.some((m) => m.month === currentMonth);

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-medium text-fg">{title}</h2>
        {financings.length > 1 ? <Legend financings={financings} /> : null}
      </div>
      <div className="mt-3 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={months} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-subtle)" />
            <XAxis
              dataKey="month"
              ticks={ticks}
              tickFormatter={(ym: string) => ym.slice(0, 4)}
              tick={{ fill: "var(--color-muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--color-subtle)" }}
              minTickGap={16}
            />
            <YAxis
              width={72}
              tickFormatter={(v: number) => brlCompactFormatter.format(v)}
              tick={{ fill: "var(--color-muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={({ active, payload }) => (
                <MonthTooltip
                  active={active}
                  month={payload?.[0]?.payload as Month | undefined}
                  financings={financings}
                  measure={measure}
                />
              )}
              cursor={{ stroke: "var(--color-muted)", strokeWidth: 1 }}
            />
            {financings.map((financing, i) => (
              <Area
                key={financing.id}
                name={financing.name}
                // Zero outside the loan's own schedule, so the stack has a
                // value to rest on; the tooltip reads the series itself and
                // leaves those months out.
                dataKey={(m: Month) => m.byFinancing[financing.id]?.[measure] ?? 0}
                stackId="financings"
                // Stepped in both charts. A Price parcela reads flat, a SAC
                // one steps down, and the month a loan ends shows as a drop.
                // A loan starting mid-span rises as one edge, where a line
                // would ramp up across the month before it existed.
                type="stepAfter"
                stroke={colorAt(i)}
                strokeWidth={1.5}
                fill={colorAt(i)}
                fillOpacity={0.3}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            ))}
            {showToday ? (
              <ReferenceLine
                x={currentMonth}
                stroke="var(--color-muted)"
                strokeDasharray="3 3"
                label={{
                  value: "hoje",
                  position: "top",
                  fill: "var(--color-muted)",
                  fontSize: 11,
                }}
              />
            ) : null}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function Legend({ financings }: { financings: FinancingOverviewSeries["financings"] }) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
      {financings.map((financing, i) => (
        <li key={financing.id} className="inline-flex items-center gap-1.5">
          <Swatch color={colorAt(i)} />
          {financing.name}
        </li>
      ))}
    </ul>
  );
}

function Swatch({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
      style={{ backgroundColor: color }}
    />
  );
}

function MonthTooltip({
  active,
  month,
  financings,
  measure,
}: {
  active: boolean;
  month: Month | undefined;
  financings: FinancingOverviewSeries["financings"];
  measure: Measure;
}) {
  if (!active || !month) return null;

  // Only the loans with a parcela that month: one that has not started or
  // has ended is not worth a zero line.
  const present = financings.flatMap((financing, i) => {
    const point = month.byFinancing[financing.id];
    return point ? [{ ...financing, color: colorAt(i), value: point[measure] }] : [];
  });
  const total = present.reduce((sum, p) => sum + p.value, 0);

  return (
    <div className="rounded-lg border border-subtle bg-surface px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-fg">{formatShortMonthYear(month.month)}</p>
      <ul className="mt-1 space-y-0.5">
        {present.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1.5 text-muted">
              <Swatch color={p.color} />
              {p.name}
            </span>
            <span className="font-mono tabular-nums text-fg">
              {brlFormatter.format(p.value)}
            </span>
          </li>
        ))}
      </ul>
      {financings.length > 1 ? (
        <p className="mt-1 flex justify-between gap-4 border-t border-subtle pt-1">
          <span className="text-muted">Total</span>
          <span className="font-mono tabular-nums text-fg">
            {brlFormatter.format(total)}
          </span>
        </p>
      ) : null}
    </div>
  );
}
