"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthUrl } from "@/helpers/paths";
import { formatMonthLabel } from "@/helpers/date";
import Card from "@/components/Card";
import {
  capitalize,
  nextMonth,
  prevMonth,
  type YearMonth,
} from "../../_helpers";
import { buildCalendarGrid } from "./_helpers";

// Monday-first to match the mockup. Brazilian-Portuguese 3-letter labels.
const DAY_HEADERS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

type Props = {
  year: number;
  month: number;
  monthOptions: YearMonth[];
  daysWithBills: number[];
  daysWithOverdueBills: number[];
  daysWithIncome: number[];
  daysWithExpenses: number[];
  highlightedDay: number | null;
  onSelectDay: (day: number) => void;
};

export default function CalendarStrip({
  year,
  month,
  monthOptions,
  daysWithBills,
  daysWithOverdueBills,
  daysWithIncome,
  daysWithExpenses,
  highlightedDay,
  onSelectDay,
}: Props) {
  const router = useRouter();
  const prev = prevMonth(year, month);
  const next = nextMonth(year, month);
  const cells = buildCalendarGrid(year, month);

  const daysWithBillsSet = new Set(daysWithBills);
  const daysWithOverdueBillsSet = new Set(daysWithOverdueBills);
  const daysWithIncomeSet = new Set(daysWithIncome);
  const daysWithExpensesSet = new Set(daysWithExpenses);

  const now = new Date();
  const todayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

  const currentValue = `${year}-${String(month).padStart(2, "0")}`;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [yStr, mStr] = e.target.value.split("-");
    router.push(monthUrl(Number(yStr), Number(mStr)));
  };

  const monthLabel = capitalize(formatMonthLabel(year, month));

  return (
    <Card className="p-5">
      {/* Header: prev arrow / month-picker-as-text / next arrow.
          The month label is a styled native <select> so the dropdown
          (jump to unlocked past months, future months) stays accessible
          while looking like plain text in the mockup. */}
      <div className="flex items-center justify-between">
        <Link
          href={monthUrl(prev.year, prev.month)}
          aria-label="Mês anterior"
          data-tooltip="Mês anterior"
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-fg"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2} />
        </Link>

        <div className="relative">
          <select
            value={currentValue}
            onChange={handleChange}
            aria-label="Ir para o mês"
            className="cursor-pointer appearance-none bg-transparent text-center text-base font-semibold text-fg focus:outline-none"
          >
            {monthOptions.map((opt) => {
              const value = `${opt.year}-${String(opt.month).padStart(2, "0")}`;
              return (
                <option key={value} value={value}>
                  {capitalize(formatMonthLabel(opt.year, opt.month))}
                </option>
              );
            })}
          </select>
          {/* Visible label overlay so the trigger reads as plain text
              regardless of <select>'s native rendering quirks. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center text-base font-semibold text-fg"
          >
            {monthLabel}
          </span>
        </div>

        <Link
          href={monthUrl(next.year, next.month)}
          aria-label="Próximo mês"
          data-tooltip="Próximo mês"
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-fg"
        >
          <ChevronRight className="h-5 w-5" strokeWidth={2} />
        </Link>
      </div>

      {/* Weekday headers */}
      <div className="mt-4 grid grid-cols-7 text-center text-xs font-medium text-muted">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          const cellKey = `${cell.year}-${cell.month}-${cell.day}`;
          const isToday = cellKey === todayKey;
          const hasOutflow =
            cell.inCurrentMonth &&
            (daysWithBillsSet.has(cell.day) ||
              daysWithExpensesSet.has(cell.day));
          const hasOverdue =
            cell.inCurrentMonth && daysWithOverdueBillsSet.has(cell.day);
          const hasIncome =
            cell.inCurrentMonth && daysWithIncomeSet.has(cell.day);
          const isHighlighted =
            cell.inCurrentMonth && highlightedDay === cell.day;

          if (!cell.inCurrentMonth) {
            return (
              <div
                key={i}
                className="flex h-12 items-center justify-center text-sm text-muted/40"
              >
                {cell.day}
              </div>
            );
          }

          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectDay(cell.day)}
              aria-pressed={isHighlighted}
              className="group flex h-12 flex-col items-center justify-center rounded-lg transition-colors hover:bg-surface-2"
            >
              <span
                className={
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors " +
                  (isToday
                    ? "bg-accent text-white font-semibold"
                    : isHighlighted
                    ? "ring-2 ring-accent text-fg"
                    : "text-fg")
                }
              >
                {cell.day}
              </span>
              <div className="mt-0.5 flex h-1.5 items-center justify-center gap-0.5">
                {hasOutflow && (
                  <span
                    className={
                      "h-1 w-1 rounded-full " +
                      (hasOverdue ? "bg-danger" : "bg-accent")
                    }
                    aria-label={
                      hasOverdue
                        ? "Tem contas vencidas em aberto"
                        : "Tem contas ou despesas"
                    }
                  />
                )}
                {hasIncome && (
                  <span
                    className="h-1 w-1 rounded-full bg-accent"
                    aria-label="Tem receita esperada"
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
