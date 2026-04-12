"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  capitalize,
  formatMonthLabel,
  monthUrl,
  nextMonth,
  prevMonth,
  type YearMonth,
} from "../../_helpers";
import { buildCalendarGrid } from "./_helpers";

const DAY_HEADERS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type Props = {
  year: number;
  month: number;
  monthOptions: YearMonth[];
  daysWithBills: number[];
  highlightedDay: number | null;
  onSelectDay: (day: number) => void;
};

export default function CalendarStrip({
  year,
  month,
  monthOptions,
  daysWithBills,
  highlightedDay,
  onSelectDay,
}: Props) {
  const router = useRouter();
  const prev = prevMonth(year, month);
  const next = nextMonth(year, month);
  const cells = buildCalendarGrid(year, month);

  // Wrap the prop in a Set for O(1) lookups during the cell render loop.
  const daysWithBillsSet = new Set(daysWithBills);

  // Today, in the user's local timezone. Used to draw the highlight on
  // whichever cell (if any) corresponds to today.
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

  // Values are "YYYY-MM" so the select's value can round-trip without a
  // second lookup. We parse on change and push to the canonical URL.
  const currentValue = `${year}-${String(month).padStart(2, "0")}`;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [yStr, mStr] = e.target.value.split("-");
    router.push(monthUrl(Number(yStr), Number(mStr)));
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href={monthUrl(prev.year, prev.month)}
            aria-label="Previous month"
            className="flex h-9 w-9 items-center justify-center rounded-md text-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          >
            ←
          </Link>

          <select
            value={currentValue}
            onChange={handleChange}
            aria-label="Jump to month"
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-50 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
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
            href={monthUrl(next.year, next.month)}
            aria-label="Next month"
            className="flex h-9 w-9 items-center justify-center rounded-md text-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          >
            →
          </Link>
        </div>

        <Link
          href="/"
          className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Today
        </Link>
      </div>

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
            const hasBill =
              cell.inCurrentMonth && daysWithBillsSet.has(cell.day);
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
                <div className="flex w-full flex-1 items-end justify-center">
                  {hasBill && (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-blue-500 dark:bg-blue-400"
                      aria-label="Has bills due"
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
