import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { todayYmd, getMonthRange } from "@/helpers/date";
import { fetchMonthUnlock, isMonthLocked } from "@/helpers/lock";
import { getEntriesForMonth } from "@/helpers/ledger";
import { getTaxonomy } from "@/helpers/taxonomy";
import { getFinancingMonthItems } from "@/helpers/financing";
import { monthDayMarkers, summarizeMonth } from "@/helpers/month-summary";
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
    taxonomy,
  ] = await Promise.all([
      fetchMonthUnlock(supabase, spaceId, year, month),
      supabase
        .from("month_unlocks")
        .select("year, month")
        .eq("space_id", spaceId),
      getEntriesForMonth(supabase, spaceIds, year, month),
      supabase
        .from("income_entries")
        .select(
          "id, space_id, name, amount, expected_date, received, category_id, payer_id"
        )
        .in("space_id", spaceIds)
        .gte("expected_date", start)
        .lte("expected_date", end)
        .order("expected_date", { ascending: true }),
      getFinancingMonthItems(supabase, spaceId, year, month),
      // Both halves of both lists in one read: `active` is what the pickers
      // may offer, `byId` is what already-filed rows are labelled with, so a
      // Receita under a retired Categoria still shows it.
      getTaxonomy(supabase, spaceId),
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
    category: i.category_id
      ? taxonomy.income.byId.get(i.category_id) ?? null
      : null,
    payer: i.payer_id ? taxonomy.payers.byId.get(i.payer_id) ?? null : null,
  }));

  const today = todayYmd();

  // Saldo and the Resumo strip. Every figure below comes out of one pure
  // fold — the page does no arithmetic of its own, so the numbers here and
  // the numbers in the emailed report cannot drift apart.
  const ledger = {
    bills: billEntries,
    expenses: expenseEntries,
    income: incomeEntries,
    financing: { bills: mortgageBills, expenses: mortgageExpenses },
    today,
  };
  const totals = summarizeMonth(ledger);
  const calendar = monthDayMarkers(ledger);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
      <MonthlyViewClient
        outflowCategories={taxonomy.outflow.active}
        incomeCategories={taxonomy.income.active}
        payers={taxonomy.payers.active}
        // Remount (reset highlighted-day state) whenever the URL
        // points at a different month.
        key={`${year}-${month}`}
        year={year}
        month={month}
        monthOptions={monthOptions}
        locked={locked}
        unlockReason={unlock?.reason ?? null}
        calendar={calendar}
        bills={{
          entries: billEntries,
          mortgages: mortgageBills,
          ...totals.bills,
        }}
        income={{ entries: incomeEntries, ...totals.income }}
        expenses={{
          entries: expenseEntries,
          mortgages: mortgageExpenses,
          ...totals.expenses,
        }}
        balance={totals.balance}
      />
    </div>
  );
}
