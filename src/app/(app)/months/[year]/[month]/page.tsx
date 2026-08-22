import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { todayYmd, getMonthRange } from "@/helpers/date";
import { fetchMonthUnlock, isMonthLocked } from "@/helpers/lock";
import { getEntriesForMonth } from "@/helpers/ledger";
import { getCategories } from "@/helpers/taxonomy";
import { getFinancingMonthItems } from "@/helpers/financing";
import { getPersonalSpaceId } from "@/helpers/spaces";
import { buildMonthOptions } from "./_helpers";
import MonthlyViewClient from "./_components/MonthlyViewClient/MonthlyViewClient";
import type { EntryRow, IncomeRow } from "./_types";

export default async function MonthlyViewPage({
  params,
}: {
  params: Promise<{ year: string; month: string }>;
}) {
  const { year: yearStr, month: monthStr } = await params;

  const year = Number(yearStr);
  const month = Number(monthStr);

  if (!Number.isInteger(year) || year < 2000 || year > 2100) notFound();
  if (!Number.isInteger(month) || month < 1 || month > 12) notFound();

  const supabase = await createClient();

  const spaceId = await getPersonalSpaceId(supabase);
  if (!spaceId) notFound();

  const spaceIds = [spaceId];
  const { start, end } = getMonthRange(year, month);

  // These four reads are independent once we have spaceId, so fire
  // them in parallel — total wait is the slowest single query
  // instead of the sum.
  //   1. Lock row for (space, year, month) — drives the locked banner.
  //   2. All unlocked-month rows for this space — drives the month dropdown.
  //   3. Unified ledger fetch (virtual + materialized entries).
  //   4. Income for the date range (no virtual-expansion layer).
  const [
    unlock,
    existingUnlocksRes,
    resolved,
    rawIncomeRes,
    financingItems,
    outflowCategories,
  ] = await Promise.all([
      fetchMonthUnlock(supabase, spaceId, year, month),
      supabase
        .from("month_unlocks")
        .select("year, month")
        .eq("space_id", spaceId),
      getEntriesForMonth(supabase, spaceIds, year, month),
      supabase
        .from("income_entries")
        .select("id, space_id, name, amount, expected_date, received")
        .in("space_id", spaceIds)
        .gte("expected_date", start)
        .lte("expected_date", end)
        .order("expected_date", { ascending: true }),
      getFinancingMonthItems(supabase, spaceIds, year, month),
      // Active only: a deactivated Categoria must not be offerable on a new
      // Despesa. Rows already filed under one still render it, because
      // getEntriesForMonth resolves Categorias by id regardless of active.
      getCategories(supabase, spaceId, "outflow"),
    ]);

  // Financing installments surface as bills; extra payments as expenses.
  const mortgageBills = financingItems.bills;
  const mortgageExpenses = financingItems.expenses;

  const locked = isMonthLocked({
    year,
    month,
    hasUnlock: unlock != null,
  });

  const monthOptions = buildMonthOptions(existingUnlocksRes.data ?? [], {
    year,
    month,
  });

  // Split into bills (template-scoped) vs expenses (one-offs).
  const billEntries: EntryRow[] = resolved.filter((e) => e.template_id != null);
  const expenseEntries: EntryRow[] = resolved.filter(
    (e) => e.template_id == null
  );

  const rawIncome = rawIncomeRes.data;

  const incomeEntries: IncomeRow[] = (rawIncome ?? []).map((i) => ({
    id: i.id,
    space_id: i.space_id,
    name: i.name,
    amount: Number(i.amount),
    expected_date: i.expected_date,
    received: i.received,
  }));

  const today = todayYmd();

  // Calendar-strip day markers, parsed out of "YYYY-MM-DD" strings
  // directly so we bypass the UTC-midnight trap.
  const daysWithBillsSet = new Set<number>();
  const daysWithOverdueBillsSet = new Set<number>();
  for (const e of billEntries) {
    const day = parseInt(e.date.split("-")[2], 10);
    if (!Number.isInteger(day)) continue;
    daysWithBillsSet.add(day);
    if (!e.paid && e.date <= today) daysWithOverdueBillsSet.add(day);
  }
  for (const b of mortgageBills) {
    const day = parseInt(b.date.split("-")[2], 10);
    if (!Number.isInteger(day)) continue;
    daysWithBillsSet.add(day);
    if (!b.paid && b.date <= today) daysWithOverdueBillsSet.add(day);
  }
  const daysWithBills = Array.from(daysWithBillsSet).sort((a, b) => a - b);
  const daysWithOverdueBills = Array.from(daysWithOverdueBillsSet).sort(
    (a, b) => a - b
  );

  const daysWithIncomeSet = new Set<number>();
  for (const i of incomeEntries) {
    const day = parseInt(i.expected_date.split("-")[2], 10);
    if (Number.isInteger(day)) daysWithIncomeSet.add(day);
  }
  const daysWithIncome = Array.from(daysWithIncomeSet).sort((a, b) => a - b);

  const daysWithExpensesSet = new Set<number>();
  for (const e of expenseEntries) {
    const day = parseInt(e.date.split("-")[2], 10);
    if (Number.isInteger(day)) daysWithExpensesSet.add(day);
  }
  for (const e of mortgageExpenses) {
    const day = parseInt(e.date.split("-")[2], 10);
    if (Number.isInteger(day)) daysWithExpensesSet.add(day);
  }
  const daysWithExpenses = Array.from(daysWithExpensesSet).sort(
    (a, b) => a - b
  );

  // Bill totals fold the regular entries together with mortgage
  // installments (a financing's payment behaves like a bill for the month).
  const totalBills =
    billEntries.reduce((s, e) => s + e.amount, 0) +
    mortgageBills.reduce((s, b) => s + b.amount, 0);
  const paidBills =
    billEntries.filter((e) => e.paid).reduce((s, e) => s + e.amount, 0) +
    mortgageBills.filter((b) => b.paid).reduce((s, b) => s + b.amount, 0);
  const remainingBills = totalBills - paidBills;

  // Unpaid bills whose date is on or before today count as money that
  // should already be gone from the account — "net so far" subtracts
  // them alongside the explicitly-paid ones.
  const overdueUnpaidBills =
    billEntries
      .filter((e) => !e.paid && e.date <= today)
      .reduce((s, e) => s + e.amount, 0) +
    mortgageBills
      .filter((b) => !b.paid && b.date <= today)
      .reduce((s, b) => s + b.amount, 0);

  const totalIncome = incomeEntries.reduce((s, e) => s + e.amount, 0);
  const receivedIncome = incomeEntries
    .filter((e) => e.received)
    .reduce((s, e) => s + e.amount, 0);
  const stillToReceive = totalIncome - receivedIncome;

  // Mortgage extra payments are real cash out → fold into expenses.
  const totalExpenses =
    expenseEntries.reduce((s, e) => s + e.amount, 0) +
    mortgageExpenses.reduce((s, e) => s + e.amount, 0);

  const netExpected = totalIncome - totalBills - totalExpenses;
  const netSoFar =
    receivedIncome - paidBills - overdueUnpaidBills - totalExpenses;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
      <MonthlyViewClient
        outflowCategories={outflowCategories}
        // Remount (reset highlighted-day state) whenever the URL
        // points at a different month.
        key={`${year}-${month}`}
        year={year}
        month={month}
        monthOptions={monthOptions}
        locked={locked}
        unlockReason={unlock?.reason ?? null}
        calendar={{
          daysWithBills,
          daysWithOverdueBills,
          daysWithIncome,
          daysWithExpenses,
        }}
        bills={{
          entries: billEntries,
          mortgages: mortgageBills,
          total: totalBills,
          paid: paidBills,
          remaining: remainingBills,
        }}
        income={{
          entries: incomeEntries,
          total: totalIncome,
          received: receivedIncome,
          stillExpected: stillToReceive,
        }}
        expenses={{
          entries: expenseEntries,
          mortgages: mortgageExpenses,
          total: totalExpenses,
        }}
        balance={{ netExpected, netSoFar }}
      />
    </div>
  );
}
