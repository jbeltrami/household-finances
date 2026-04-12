"use client";

import { useState } from "react";
import BillInstanceRow from "../BillInstanceRow/BillInstanceRow";
import CalendarStrip from "../CalendarStrip/CalendarStrip";
import CreateIncomeEntryForm from "../CreateIncomeEntryForm/CreateIncomeEntryForm";
import CreateOneOffExpenseForm from "../CreateOneOffExpenseForm/CreateOneOffExpenseForm";
import ExpenseEntryRow from "../ExpenseEntryRow/ExpenseEntryRow";
import IncomeEntryRow from "../IncomeEntryRow/IncomeEntryRow";
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

export type IncomeRow = {
  id: string;
  name: string;
  amount: number | string;
  expected_date: string | null;
  received: boolean;
};

export type ExpenseRow = {
  id: string;
  name: string;
  amount: number | string;
  date: string | null;
  category: string | null;
  notes: string | null;
};

type Props = {
  year: number;
  month: number;
  monthOptions: YearMonth[];
  daysWithBills: number[];
  daysWithIncome: number[];
  daysWithExpenses: number[];
  locked: boolean;
  monthId: string;
  unlockReason: string | null;
  instances: BillRow[];
  incomeEntries: IncomeRow[];
  expenses: ExpenseRow[];
  totalBills: number;
  paidBills: number;
  remainingBills: number;
  totalIncome: number;
  receivedIncome: number;
  stillToReceive: number;
  netExpected: number;
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
  daysWithIncome,
  daysWithExpenses,
  locked,
  monthId,
  unlockReason,
  instances,
  incomeEntries,
  expenses,
  totalBills,
  paidBills,
  remainingBills,
  totalIncome,
  receivedIncome,
  stillToReceive,
  netExpected,
}: Props) {
  const hasAnyData =
    instances.length > 0 ||
    incomeEntries.length > 0 ||
    expenses.length > 0;
  const [highlightedDay, setHighlightedDay] = useState<number | null>(null);
  const [showAddIncomeForm, setShowAddIncomeForm] = useState(false);
  const [showAddExpenseForm, setShowAddExpenseForm] = useState(false);

  // Clicking the same day again toggles the highlight off. Clicking a
  // different day replaces the highlight.
  const handleSelectDay = (day: number) => {
    setHighlightedDay((current) => (current === day ? null : day));
  };

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
      {/* Left column on desktop (1/4 width) — calendar controls + grid.
          On mobile this is the first stacked row; only the controls are
          visible there because the grid inside CalendarStrip is hidden
          below the md breakpoint. */}
      <aside className="md:col-span-1">
        <CalendarStrip
          year={year}
          month={month}
          monthOptions={monthOptions}
          daysWithBills={daysWithBills}
          daysWithIncome={daysWithIncome}
          daysWithExpenses={daysWithExpenses}
          highlightedDay={highlightedDay}
          onSelectDay={handleSelectDay}
        />
      </aside>

      {/* Right column on desktop (3/4 width) — everything else. */}
      <div className="md:col-span-3">
        {locked && <UnlockBanner monthId={monthId} year={year} month={month} />}

        {!locked && unlockReason && (
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Unlocked: {unlockReason}
          </p>
        )}

        <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">
            Income
          </h2>
          {!locked && (
            <button
              type="button"
              onClick={() => setShowAddIncomeForm((s) => !s)}
              aria-label={
                showAddIncomeForm ? "Cancel adding income" : "Add income"
              }
              aria-expanded={showAddIncomeForm}
              className="flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            >
              {showAddIncomeForm ? "×" : "+"}
            </button>
          )}
        </div>

        {!locked && showAddIncomeForm && (
          <CreateIncomeEntryForm
            monthId={monthId}
            year={year}
            month={month}
            onSuccess={() => setShowAddIncomeForm(false)}
          />
        )}

        {incomeEntries.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            No income recorded for this month.
          </p>
        ) : (
          <>
            <ul className="mt-2 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
              {incomeEntries.map((entry) => (
                <IncomeEntryRow
                  key={entry.id}
                  entry={entry}
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
                  Total income
                </dt>
                <dd className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                  {brlFormatter.format(totalIncome)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400">
                  Received so far
                </dt>
                <dd className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                  {brlFormatter.format(receivedIncome)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400">
                  Still expected
                </dt>
                <dd className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                  {brlFormatter.format(stillToReceive)}
                </dd>
              </div>
            </dl>
          </>
        )}
      </section>

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

        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">
              Expenses
            </h2>
            {!locked && (
              <button
                type="button"
                onClick={() => setShowAddExpenseForm((s) => !s)}
                aria-label={
                  showAddExpenseForm ? "Cancel adding expense" : "Add expense"
                }
                aria-expanded={showAddExpenseForm}
                className="flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
              >
                {showAddExpenseForm ? "×" : "+"}
              </button>
            )}
          </div>

          {!locked && showAddExpenseForm && (
            <CreateOneOffExpenseForm
              monthId={monthId}
              year={year}
              month={month}
              onSuccess={() => setShowAddExpenseForm(false)}
            />
          )}

          {expenses.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              No one-off expenses recorded for this month.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
              {expenses.map((expense) => (
                <ExpenseEntryRow
                  key={expense.id}
                  expense={expense}
                  year={year}
                  month={month}
                  locked={locked}
                  highlightedDay={highlightedDay}
                />
              ))}
            </ul>
          )}
        </section>

        {hasAnyData && (
          <section className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-700">
            <div className="flex items-baseline justify-between">
              <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">
                Net (expected)
              </h2>
              <p
                className={`text-2xl font-semibold ${
                  netExpected > 0
                    ? "text-green-600 dark:text-green-400"
                    : netExpected < 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-gray-900 dark:text-gray-100"
                }`}
              >
                {brlFormatter.format(netExpected)}
              </p>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Total income minus total bills.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
