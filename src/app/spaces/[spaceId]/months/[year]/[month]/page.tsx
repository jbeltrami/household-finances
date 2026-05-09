import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { todayYmd, getMonthRange } from "@/helpers/date";
import { fetchMonthUnlock, isMonthLocked } from "@/helpers/lock";
import { getEntriesForMonth } from "@/helpers/ledger";
import { buildMonthOptions } from "./_helpers";
import MonthlyViewClient from "./_components/MonthlyViewClient/MonthlyViewClient";
import type { EntryRow, IncomeRow } from "./_types";

export default async function MonthlyViewPage({
  params,
}: {
  params: Promise<{ spaceId: string; year: string; month: string }>;
}) {
  const { spaceId, year: yearStr, month: monthStr } = await params;

  const year = Number(yearStr);
  const month = Number(monthStr);

  if (!Number.isInteger(year) || year < 2000 || year > 2100) notFound();
  if (!Number.isInteger(month) || month < 1 || month > 12) notFound();

  const supabase = await createClient();

  const spaceIds = [spaceId];

  // Lock state: unlocked if there's a row in month_unlocks for this
  // (space, year, month) OR if the month is current/future.
  const unlock = await fetchMonthUnlock(supabase, spaceId, year, month);
  const locked = isMonthLocked({
    year,
    month,
    hasUnlock: unlock != null,
  });

  // Dropdown options: unlocked past months plus the next 6 months.
  // Querying month_unlocks for the viewed space gives us a good hint
  // at which past months the user has touched recently.
  const { data: existingUnlocks } = await supabase
    .from("month_unlocks")
    .select("year, month")
    .eq("space_id", spaceId);

  const monthOptions = buildMonthOptions(existingUnlocks ?? [], {
    year,
    month,
  });

  // Unified ledger fetch — merges virtual template occurrences with
  // materialized exceptions across every aggregate space.
  const resolved = await getEntriesForMonth(supabase, spaceIds, year, month);

  // Split into bills (template-scoped) vs expenses (one-offs).
  const billEntries: EntryRow[] = resolved.filter((e) => e.template_id != null);
  const expenseEntries: EntryRow[] = resolved.filter(
    (e) => e.template_id == null
  );

  // Income is queried directly since it has no virtual-expansion layer.
  const { start, end } = getMonthRange(year, month);

  const { data: rawIncome } = await supabase
    .from("income_entries")
    .select("id, space_id, name, amount, expected_date, received")
    .in("space_id", spaceIds)
    .gte("expected_date", start)
    .lte("expected_date", end)
    .order("expected_date", { ascending: true });

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
  const daysWithExpenses = Array.from(daysWithExpensesSet).sort(
    (a, b) => a - b
  );

  const totalBills = billEntries.reduce((s, e) => s + e.amount, 0);
  const paidBills = billEntries
    .filter((e) => e.paid)
    .reduce((s, e) => s + e.amount, 0);
  const remainingBills = totalBills - paidBills;

  // Unpaid bills whose date is on or before today count as money that
  // should already be gone from the account — "net so far" subtracts
  // them alongside the explicitly-paid ones.
  const overdueUnpaidBills = billEntries
    .filter((e) => !e.paid && e.date <= today)
    .reduce((s, e) => s + e.amount, 0);

  const totalIncome = incomeEntries.reduce((s, e) => s + e.amount, 0);
  const receivedIncome = incomeEntries
    .filter((e) => e.received)
    .reduce((s, e) => s + e.amount, 0);
  const stillToReceive = totalIncome - receivedIncome;

  const totalExpenses = expenseEntries.reduce((s, e) => s + e.amount, 0);

  const netExpected = totalIncome - totalBills - totalExpenses;
  const netSoFar =
    receivedIncome - paidBills - overdueUnpaidBills - totalExpenses;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <MonthlyViewClient
        // Remount (reset highlighted-day state) whenever the URL
        // points at a different month.
        key={`${year}-${month}`}
        spaceId={spaceId}
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
        expenses={{ entries: expenseEntries, total: totalExpenses }}
        balance={{ netExpected, netSoFar }}
      />
    </div>
  );
}
