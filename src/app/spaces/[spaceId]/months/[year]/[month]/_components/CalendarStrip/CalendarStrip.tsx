"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { spaceMonthUrl } from "@/helpers/paths";
import { formatMonthLabel } from "@/helpers/date";
import {
  capitalize,
  nextMonth,
  prevMonth,
  type YearMonth,
} from "../../_helpers";
import { buildCalendarGrid } from "./_helpers";

const DAY_HEADERS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type Props = {
  spaceId: string;
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
  spaceId,
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

  // Wrap the props in Sets for O(1) lookups during the cell render loop.
  const daysWithBillsSet = new Set(daysWithBills);
  const daysWithOverdueBillsSet = new Set(daysWithOverdueBills);
  const daysWithIncomeSet = new Set(daysWithIncome);
  const daysWithExpensesSet = new Set(daysWithExpenses);

  // Today, in the user's local timezone. Used to draw the highlight on
  // whichever cell (if any) corresponds to today.
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

  // Values are "YYYY-MM" so the select's value can round-trip without a
  // second lookup. We parse on change and push to the canonical URL.
  const currentValue = `${year}-${String(month).padStart(2, "0")}`;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [yStr, mStr] = e.target.value.split("-");
    router.push(spaceMonthUrl(spaceId, Number(yStr), Number(mStr)));
  };

  return (
    <>
      {/* Controls: prev / dropdown / next on top, Today on its own row.
          This stacked layout works for both a full-width mobile column
          and a narrow desktop sidebar without reflowing. */}
      <div className="flex items-center gap-2">
        <Link
          href={spaceMonthUrl(spaceId, prev.year, prev.month)}
          aria-label="Previous month"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
        >
          ←
        </Link>

        <select
          value={currentValue}
          onChange={handleChange}
          aria-label="Jump to month"
          className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-50 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
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

        <Link
          href={spaceMonthUrl(spaceId, next.year, next.month)}
          aria-label="Next month"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
        >
          →
        </Link>
      </div>

      <Link
        href={spaceMonthUrl(spaceId, now.getFullYear(), now.getMonth() + 1)}
        className="mt-2 block rounded-md py-1.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        Today
      </Link>

      {/* Calendar grid — desktop only */}
      <div className="mt-4 hidden md:block">
        <div className="grid grid-cols-7 text-center text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {DAY_HEADERS.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200 dark:border-gray-700 dark:bg-gray-700">
          {cells.map((cell, i) => {
            const cellKey = `${cell.year}-${cell.month}-${cell.day}`;
            const isToday = cellKey === todayKey;
            // Bills and expenses share the outflow dot (user's choice).
            // Union them so we render a single dot when either has activity
            // on that day. The dot turns red when at least one bill on
            // that day is past due and still unpaid.
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

            // Padding cells (previous/next month) stay as non-interactive
            // divs. Current-month cells become buttons so users can click
            // to highlight matching bills in the list below.
            if (!cell.inCurrentMonth) {
              return (
                <div
                  key={i}
                  className="flex min-h-16 flex-col bg-white p-1.5 dark:bg-gray-800"
                >
                  <div className="flex justify-end">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs text-gray-400 dark:text-gray-600">
                      {cell.day}
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <button
                key={i}
                type="button"
                onClick={() => onSelectDay(cell.day)}
                className={`flex min-h-16 flex-col bg-white p-1.5 text-left hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 ${
                  isHighlighted
                    ? "ring-2 ring-inset ring-blue-500"
                    : ""
                }`}
                aria-pressed={isHighlighted}
              >
                <div className="flex w-full justify-end">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                      isToday
                        ? "bg-blue-600 font-semibold text-white"
                        : "text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    {cell.day}
                  </span>
                </div>
                <div className="flex w-full flex-1 items-end justify-center gap-1">
                  {hasOutflow && (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        hasOverdue
                          ? "bg-red-500 dark:bg-red-400"
                          : "bg-blue-500 dark:bg-blue-400"
                      }`}
                      aria-label={
                        hasOverdue
                          ? "Has overdue unpaid bills"
                          : "Has bills or expenses"
                      }
                    />
                  )}
                  {hasIncome && (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-green-500 dark:bg-green-400"
                      aria-label="Has income expected"
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
