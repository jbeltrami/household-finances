import Link from "next/link";
import {
  formatMonthLabel,
  monthUrl,
  nextMonth,
  prevMonth,
} from "./_helpers";

type Props = {
  year: number;
  month: number;
};

// Server component that renders the month header: prev arrow, month label,
// next arrow, and a "Today" link. Today points to `/` so the redirect there
// always lands on the truly-current month, even if this HTML was rendered
// some time ago.
export default function MonthNavigation({ year, month }: Props) {
  const prev = prevMonth(year, month);
  const next = nextMonth(year, month);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link
          href={monthUrl(prev.year, prev.month)}
          aria-label="Previous month"
          className="flex h-8 w-8 items-center justify-center rounded-md text-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
        >
          ←
        </Link>
        <h1 className="text-2xl font-semibold capitalize text-gray-900 dark:text-gray-100">
          {formatMonthLabel(year, month)}
        </h1>
        <Link
          href={monthUrl(next.year, next.month)}
          aria-label="Next month"
          className="flex h-8 w-8 items-center justify-center rounded-md text-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
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
  );
}
