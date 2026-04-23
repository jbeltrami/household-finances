"use client";

import { useState } from "react";
import BalanceSection from "../BalanceSection/BalanceSection";
import BillsSection from "../BillsSection/BillsSection";
import CalendarStrip from "../CalendarStrip/CalendarStrip";
import ExpensesSection from "../ExpensesSection/ExpensesSection";
import IncomeSection from "../IncomeSection/IncomeSection";
import UnlockBanner from "../UnlockBanner/UnlockBanner";
import type { MonthlyViewProps } from "../../_types";

export default function MonthlyViewClient({
  spaceId,
  year,
  month,
  monthOptions,
  locked,
  unlockReason,
  calendar,
  bills,
  income,
  expenses,
  balance,
  attributions,
}: MonthlyViewProps) {
  const hasAnyData = !!(
    bills.entries.length ||
    income.entries.length ||
    expenses.entries.length ||
    balance.savingsNet
  );
  const [highlightedDay, setHighlightedDay] = useState<number | null>(null);

  const handleSelectDay = (day: number) => {
    setHighlightedDay((current) => (current === day ? null : day));
  };

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
      <aside className="md:col-span-1">
        <CalendarStrip
          spaceId={spaceId}
          year={year}
          month={month}
          monthOptions={monthOptions}
          daysWithBills={calendar.daysWithBills}
          daysWithOverdueBills={calendar.daysWithOverdueBills}
          daysWithIncome={calendar.daysWithIncome}
          daysWithExpenses={calendar.daysWithExpenses}
          highlightedDay={highlightedDay}
          onSelectDay={handleSelectDay}
        />
      </aside>

      <div className="md:col-span-3">
        {locked && (
          <UnlockBanner spaceId={spaceId} year={year} month={month} />
        )}

        {!locked && unlockReason && (
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Unlocked: {unlockReason}
          </p>
        )}

        <IncomeSection
          income={income}
          spaceId={spaceId}
          year={year}
          month={month}
          locked={locked}
          highlightedDay={highlightedDay}
          attributions={attributions}
        />

        <BillsSection
          spaceId={spaceId}
          bills={bills}
          year={year}
          month={month}
          locked={locked}
          highlightedDay={highlightedDay}
          attributions={attributions}
        />

        <ExpensesSection
          expenses={expenses}
          spaceId={spaceId}
          year={year}
          month={month}
          locked={locked}
          highlightedDay={highlightedDay}
          attributions={attributions}
        />

        {hasAnyData && <BalanceSection balance={balance} />}
      </div>
    </div>
  );
}
