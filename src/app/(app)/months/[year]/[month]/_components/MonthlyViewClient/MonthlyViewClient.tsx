"use client";

import { useRef, useState } from "react";
import BillsSection from "../BillsSection/BillsSection";
import CalendarStrip from "../CalendarStrip/CalendarStrip";
import { calendarDaySelector } from "../CalendarStrip/_helpers";
import RangeTotalCard from "../RangeTotalCard/RangeTotalCard";
import ExpensesSection from "../ExpensesSection/ExpensesSection";
import IncomeSection from "../IncomeSection/IncomeSection";
import ResumoCard from "../ResumoCard/ResumoCard";
import SaldoCard from "../SaldoCard/SaldoCard";
import UnlockBanner from "../UnlockBanner/UnlockBanner";
import { selectDay, type DayRange } from "@/helpers/day-range";
import type { MonthlyViewProps } from "../../_types";

export default function MonthlyViewClient({
  outflowCategories,
  incomeCategories,
  payers,
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
  // The Período: one selection driving both readouts, the widget beneath
  // Saldo and the row highlighting further down. Two independent day
  // selections on one page would be worse than either.
  const [highlightedRange, setHighlightedRange] = useState<DayRange | null>(
    null
  );

  // Wraps the calendar so clearing can hand focus back to a day button inside
  // it. A ref on the container rather than on each button: the calendar owns
  // its own grid, and this only needs to find one node in it by the day it
  // carries.
  const calendarRef = useRef<HTMLDivElement>(null);

  // Every rule about what a click does lives in `selectDay`, where it is
  // tested. This is the wiring.
  const handleSelectDay = (day: number) => {
    setHighlightedRange((current) => selectDay(current, day));
  };

  // Clearing unmounts the widget the X sits in, so the element holding focus
  // disappears and focus falls to the top of the document — a mouse user sees
  // nothing, a keyboard user loses their place entirely. Move focus to the
  // calendar day button for the Período's start instead: that button never
  // unmounts, and it is where the user's attention was when they selected.
  //
  // Focus first, then clear. The button is a live node either way, but doing
  // it in this order means nothing is ever focused on a node on its way out.
  const handleClearRange = () => {
    const start = highlightedRange?.from;
    if (start != null) {
      calendarRef.current
        ?.querySelector<HTMLButtonElement>(calendarDaySelector(start))
        ?.focus();
    }
    setHighlightedRange(null);
  };

  return (
    <div className="flex flex-col gap-5">
      {locked && <UnlockBanner year={year} month={month} />}

      {!locked && unlockReason && (
        <p className="text-xs text-muted">Desbloqueado: {unlockReason}</p>
      )}

      {/* Row 1 — Calendar + Saldo, 60/40 split on md+ */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-5">
        <div className="md:col-span-3" ref={calendarRef}>
          <CalendarStrip
            year={year}
            month={month}
            monthOptions={monthOptions}
            daysWithBills={calendar.daysWithBills}
            daysWithOverdueBills={calendar.daysWithOverdueBills}
            daysWithIncome={calendar.daysWithIncome}
            daysWithExpenses={calendar.daysWithExpenses}
            highlightedRange={highlightedRange}
            onSelectDay={handleSelectDay}
          />
        </div>
        <div className="flex flex-col gap-5 md:col-span-2">
          <SaldoCard balance={balance} />
          <RangeTotalCard
            year={year}
            month={month}
            range={highlightedRange}
            bills={bills}
            onClear={handleClearRange}
          />
        </div>
      </div>

      {/* Row 2 — Receitas + Despesas side by side */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <IncomeSection
          categories={incomeCategories}
          payers={payers}
          income={income}
          year={year}
          month={month}
          locked={locked}
          highlightedRange={highlightedRange}
        />
        <ExpensesSection
          categories={outflowCategories}
          expenses={expenses}
          year={year}
          month={month}
          locked={locked}
          highlightedRange={highlightedRange}
        />
      </div>

      {/* Row 3 — Contas, full width */}
      <BillsSection
        bills={bills}
        year={year}
        month={month}
        locked={locked}
        highlightedRange={highlightedRange}
      />

      {/* Row 4 — Resumo, full width */}
      <ResumoCard income={income} bills={bills} expenses={expenses} />
    </div>
  );
}
