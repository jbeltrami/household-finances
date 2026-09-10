"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthUrl } from "@/helpers/paths";
import { formatMonthLabel } from "@/helpers/date";
import { isInRange, type DayRange } from "@/helpers/day-range";
import Card from "@/components/Card";
import {
  capitalize,
  nextMonth,
  prevMonth,
  type YearMonth,
} from "../../_helpers";
import { buildCalendarGrid, CALENDAR_DAY_ATTR } from "./_helpers";

// Sunday-first, in the order JS Date.getDay() already numbers the days.
// Every other weekday list in the app runs Dom→Sáb straight off getDay() —
// the picker in BillTemplateFields, the labels in ActiveTemplatesSection —
// and this calendar was the only surface rotating away from it, which is
// also the order pt-BR reads a week in. Brazilian-Portuguese 3-letter labels.
const DAY_HEADERS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type Props = {
  year: number;
  month: number;
  monthOptions: YearMonth[];
  daysWithBills: number[];
  daysWithOverdueBills: number[];
  daysWithIncome: number[];
  daysWithExpenses: number[];
  highlightedRange: DayRange | null;
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
  highlightedRange,
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
            className="cursor-pointer appearance-none bg-transparent text-center text-base font-semibold text-transparent focus:outline-none"
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
          // Three states, not two: inside the Período, and — within that —
          // one of its ends. A span has to read as a span rather than as a
          // row of unrelated marks, so every day in it is tinted and the two
          // ends carry a ring on top of that. All of it in the accent the
          // selected day already used; this spends no red, because red on an
          // aggregate means outflow and red on a row means Vencida, and a
          // selection is neither.
          const inRange =
            cell.inCurrentMonth && isInRange(highlightedRange, cell.day);
          const isRangeEnd =
            inRange &&
            highlightedRange !== null &&
            (cell.day === highlightedRange.from ||
              cell.day === highlightedRange.to);

          // The dots are decoration, and what they mean has to reach the
          // button's accessible name as real text. `aria-label` could not do
          // that job where it used to sit: naming is prohibited on the
          // generic role a bare <span> has, so those labels were not reliably
          // exposed and each day announced nothing but its own number —
          // losing Vencida, the app's one urgency signal, entirely.
          const marks = [
            hasOutflow
              ? hasOverdue
                ? "tem contas vencidas em aberto"
                : "tem contas ou despesas"
              : null,
            hasIncome ? "tem receita esperada" : null,
          ]
            .filter(Boolean)
            .join(", ");

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
              {...{ [CALENDAR_DAY_ATTR]: cell.day }}
              /*
                No `aria-pressed`. ARIA defines it for a toggle button, where
                activating it once sets it and activating it again unsets it —
                and a day in the middle of a Período is neither independent of
                the other days nor un-pressable on its own, so the attribute
                would assert something false. Saying it properly means
                `aria-selected` on a `gridcell`, which is a grid this calendar
                does not have; adopting grid semantics is out of scope by
                decision, and asserting nothing beats asserting wrongly.
              */
              className={
                "group flex h-12 flex-col items-center justify-center rounded-lg transition-colors " +
                // The hover tint is conditional rather than unconditional
                // because `hover:bg-surface-2` outranks a plain `bg-*` on
                // specificity whatever order they sit in the string — so an
                // unconditional one repaints a day in the Período as though it
                // were outside for as long as the cursor is on it.
                (inRange
                  ? "bg-accent-soft " +
                    (isRangeEnd ? "ring-2 ring-inset ring-accent" : "")
                  : "hover:bg-surface-2")
              }
            >
              {/*
                The circle says only whether the day is today, exactly as it
                did before. The selection is drawn on the cell around it — the
                tint for membership, the ring for an end — so the two never
                compete for the same pixels: a day that is both today and an
                end of the Período used to render as plain today, because
                whichever branch won the cascade erased the other.
              */}
              <span
                className={
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors " +
                  (isToday ? "bg-accent text-white font-semibold" : "text-fg")
                }
              >
                {cell.day}
              </span>
              {marks && <span className="sr-only">{marks}</span>}
              <div
                aria-hidden="true"
                className="mt-0.5 flex h-1.5 items-center justify-center gap-0.5"
              >
                {hasOutflow && (
                  <span
                    className={
                      "h-1 w-1 rounded-full " +
                      (hasOverdue ? "bg-danger" : "bg-accent")
                    }
                  />
                )}
                {hasIncome && (
                  <span className="h-1 w-1 rounded-full bg-accent" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
