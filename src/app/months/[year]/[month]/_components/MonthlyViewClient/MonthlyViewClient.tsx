"use client";

import { useState } from "react";
import BillInstanceRow from "../BillInstanceRow/BillInstanceRow";
import CalendarStrip from "../CalendarStrip/CalendarStrip";
import UnlockBanner from "../UnlockBanner/UnlockBanner";
import { type YearMonth } from "../../_helpers";

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export type BillRow = {
  id: string;
  name: string;
  amount: number | string;
  due_date: string | null;
  paid: boolean;
};

type Props = {
  year: number;
  month: number;
  monthOptions: YearMonth[];
  daysWithBills: number[];
  locked: boolean;
  monthId: string;
  unlockReason: string | null;
  instances: BillRow[];
  totalBills: number;
  paidBills: number;
  remainingBills: number;
};

// Thin client wrapper that owns the highlighted-day state shared between
// the calendar (writer) and the bills list (reader). The parent page
// re-mounts this component when year/month change (via `key`), which
// resets the highlight automatically.
export default function MonthlyViewClient({
  year,
  month,
  monthOptions,
  daysWithBills,
  locked,
  monthId,
  unlockReason,
  instances,
  totalBills,
  paidBills,
  remainingBills,
}: Props) {
  const [highlightedDay, setHighlightedDay] = useState<number | null>(null);

  // Clicking the same day again toggles the highlight off. Clicking a
  // different day replaces the highlight.
  const handleSelectDay = (day: number) => {
    setHighlightedDay((current) => (current === day ? null : day));
  };

  return (
    <>
      <CalendarStrip
        year={year}
        month={month}
        monthOptions={monthOptions}
        daysWithBills={daysWithBills}
        highlightedDay={highlightedDay}
        onSelectDay={handleSelectDay}
      />

      {locked && <UnlockBanner monthId={monthId} year={year} month={month} />}

      {!locked && unlockReason && (
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Unlocked: {unlockReason}
        </p>
      )}

      <section className="mt-6">
        <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">
          Bills
        </h2>
        {instances.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            No bills this month. Add a recurring template under{" "}
            <a href="/bills" className="underline">
              Bills
            </a>{" "}
            and revisit this page to generate instances.
          </p>
        ) : (
          <>
            <ul className="mt-4 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
              {instances.map((i) => (
                <BillInstanceRow
                  key={i.id}
                  instance={i}
                  year={year}
                  month={month}
                  locked={locked}
                  highlightedDay={highlightedDay}
                />
              ))}
            </ul>

            <dl className="mt-4 grid grid-cols-3 gap-4 rounded-lg border border-gray-200 bg-white p-4 text-sm dark:border-gray-700 dark:bg-gray-800">
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400">
                  Total bills
                </dt>
                <dd className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                  {brlFormatter.format(totalBills)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400">
                  Paid so far
                </dt>
                <dd className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                  {brlFormatter.format(paidBills)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400">
                  Still to pay
                </dt>
                <dd className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                  {brlFormatter.format(remainingBills)}
                </dd>
              </div>
            </dl>
          </>
        )}
      </section>
    </>
  );
}
