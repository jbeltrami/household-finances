"use client";

import { useState } from "react";
import BillsSection from "../BillsSection/BillsSection";
import CalendarStrip from "../CalendarStrip/CalendarStrip";
import ExpensesSection from "../ExpensesSection/ExpensesSection";
import IncomeSection from "../IncomeSection/IncomeSection";
import ResumoCard from "../ResumoCard/ResumoCard";
import SaldoCard from "../SaldoCard/SaldoCard";
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
}: MonthlyViewProps) {
  const [highlightedDay, setHighlightedDay] = useState<number | null>(null);

  const handleSelectDay = (day: number) => {
    setHighlightedDay((current) => (current === day ? null : day));
  };

  return (
    <div className="flex flex-col gap-5">
      {locked && <UnlockBanner spaceId={spaceId} year={year} month={month} />}

      {!locked && unlockReason && (
        <p className="text-xs text-muted">Desbloqueado: {unlockReason}</p>
      )}

      {/* Row 1 — Calendar + Saldo, 60/40 split on md+ */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-5">
        <div className="md:col-span-3">
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
        </div>
        <div className="md:col-span-2">
          <SaldoCard balance={balance} />
        </div>
      </div>

      {/* Row 2 — Receitas + Despesas side by side */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <IncomeSection
          income={income}
          spaceId={spaceId}
          year={year}
          month={month}
          locked={locked}
          highlightedDay={highlightedDay}
        />
        <ExpensesSection
          expenses={expenses}
          spaceId={spaceId}
          year={year}
          month={month}
          locked={locked}
          highlightedDay={highlightedDay}
        />
      </div>

      {/* Row 3 — Contas, full width */}
      <BillsSection
        spaceId={spaceId}
        bills={bills}
        year={year}
        month={month}
        locked={locked}
        highlightedDay={highlightedDay}
      />

      {/* Row 4 — Resumo, full width */}
      <ResumoCard income={income} bills={bills} />
    </div>
  );
}
