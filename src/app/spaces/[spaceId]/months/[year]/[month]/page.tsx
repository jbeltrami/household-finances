import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { todayYmd } from "@/helpers/date";
import {
  getAggregateSpaceIds,
  getSpaceAttributions,
} from "@/helpers/spaces";
import {
  buildMonthOptions,
  getOrCreateMonth,
  isMonthLocked,
} from "./_helpers";
import MonthlyViewClient from "./_components/MonthlyViewClient/MonthlyViewClient";
import type { BillRow, ExpenseRow, IncomeRow } from "./_types";

type BillInstanceWithTemplate = {
  id: string;
  space_id: string;
  template_id: string;
  amount: number | string;
  due_date: string | null;
  paid: boolean;
  installments_covered: number;
  recurring_bill_templates: {
    name: string;
    default_amount: number | string;
    installments_total: number | null;
  } | null;
};

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

  // Compute the set of space IDs for this view. For a personal space
  // this is just [spaceId]. For a shared space it's [sharedId, ...linkedPersonalIds],
  // which is what makes the aggregate view union data from all members.
  const spaceIds = await getAggregateSpaceIds(supabase, spaceId);

  // Get/create the month row for the *viewed* space (triggers
  // syncBillInstances for this space only — we don't create months
  // or generate instances in other members' personal spaces).
  const monthRow = await getOrCreateMonth(supabase, spaceId, year, month);

  const locked = isMonthLocked({
    year: monthRow.year,
    month: monthRow.month,
    unlock_reason: monthRow.unlock_reason,
  });

  // Fetch all existing months in the viewed space for the dropdown.
  // The dropdown only shows months that *this* space has visited —
  // not months from linked personal spaces.
  const { data: existingMonths } = await supabase
    .from("months")
    .select("year, month")
    .eq("space_id", spaceId);

  const monthOptions = buildMonthOptions(existingMonths ?? [], {
    year,
    month,
  });

  // Collect month row IDs for this year/month across ALL aggregate
  // spaces. Linked personal spaces may or may not have a month row
  // for this year/month — if they don't, they simply contribute
  // nothing (we never create months in someone else's space).
  const { data: aggregateMonths } = await supabase
    .from("months")
    .select("id")
    .in("space_id", spaceIds)
    .eq("year", year)
    .eq("month", month);

  const allMonthIds = (aggregateMonths ?? []).map((m) => m.id);

  // Nested select: pulls each instance plus its template name.
  // Queries across all aggregate month IDs so the shared-space view
  // includes bill instances from every linked personal space.
  const { data: rawInstances } = await supabase
    .from("bill_instances")
    .select(
      "id, space_id, template_id, amount, due_date, paid, installments_covered, recurring_bill_templates(name, default_amount, installments_total)"
    )
    .in("month_id", allMonthIds)
    .order("due_date", { ascending: true, nullsFirst: false });

  const rawWithTemplate = (rawInstances ??
    []) as unknown as BillInstanceWithTemplate[];

  // For installment templates visible this month, fetch total covered-units
  // paid across *all* months so we can show "X/Y" progress next to the name.
  // We read from every paid instance of these templates regardless of month,
  // which is how a prepayment in an earlier month shows up here.
  const installmentTemplateIds = Array.from(
    new Set(
      rawWithTemplate
        .filter((i) => i.recurring_bill_templates?.installments_total != null)
        .map((i) => i.template_id)
    )
  );

  const paidCoveredByTemplate = new Map<string, number>();
  if (installmentTemplateIds.length > 0) {
    const { data: paidRows } = await supabase
      .from("bill_instances")
      .select("template_id, installments_covered")
      .in("template_id", installmentTemplateIds)
      .eq("paid", true);

    for (const p of paidRows ?? []) {
      const tid = p.template_id as string;
      const cov = (p.installments_covered as number) ?? 1;
      paidCoveredByTemplate.set(
        tid,
        (paidCoveredByTemplate.get(tid) ?? 0) + cov
      );
    }
  }

  // Flatten the nested template name into a simpler row shape that the
  // client wrapper can pass straight to BillInstanceRow.
  const instances: BillRow[] = rawWithTemplate.map((i) => {
    const total = i.recurring_bill_templates?.installments_total ?? null;
    const progress =
      total != null
        ? {
            paid: paidCoveredByTemplate.get(i.template_id) ?? 0,
            total,
            remaining:
              total - (paidCoveredByTemplate.get(i.template_id) ?? 0),
            defaultAmount: Number(
              i.recurring_bill_templates?.default_amount ?? 0
            ),
          }
        : null;

    return {
      id: i.id,
      space_id: i.space_id,
      template_id: i.template_id,
      name: i.recurring_bill_templates?.name ?? "(unnamed)",
      amount: i.amount,
      due_date: i.due_date,
      paid: i.paid,
      installments_covered: i.installments_covered ?? 1,
      installmentProgress: progress,
    };
  });

  // Income entries across all aggregate months for this year/month.
  const { data: rawIncomeEntries } = await supabase
    .from("income_entries")
    .select("id, space_id, name, amount, expected_date, received")
    .in("month_id", allMonthIds)
    .order("expected_date", { ascending: true, nullsFirst: false });

  const incomeEntries: IncomeRow[] = (rawIncomeEntries ?? []).map((i) => ({
    id: i.id,
    space_id: i.space_id,
    name: i.name,
    amount: i.amount,
    expected_date: i.expected_date,
    received: i.received,
  }));

  // One-off expenses across all aggregate months.
  const { data: rawExpenses } = await supabase
    .from("one_off_expenses")
    .select("id, space_id, name, amount, date, category, notes")
    .in("month_id", allMonthIds)
    .order("date", { ascending: true, nullsFirst: false });

  const expenses: ExpenseRow[] = (rawExpenses ?? []).map((e) => ({
    id: e.id,
    space_id: e.space_id,
    name: e.name,
    amount: e.amount,
    date: e.date,
    category: e.category,
    notes: e.notes,
  }));

  // Savings contributions across all aggregate months. We only need
  // the amounts — the sum is the net movement for the month.
  const { data: rawSavingsContributions } = await supabase
    .from("savings_contributions")
    .select("amount")
    .in("month_id", allMonthIds);

  const savingsNet = (rawSavingsContributions ?? []).reduce(
    (sum, c) => sum + Number(c.amount),
    0
  );

  const today = todayYmd();

  // Build the deduped list of days in this month that have bills due.
  // due_date is a "YYYY-MM-DD" string; the third segment is the day. We
  // parse it directly without going through Date() to avoid timezone shifts.
  // At the same time, collect days that have at least one *overdue* unpaid
  // bill so the calendar can flag them in red.
  const daysWithBillsSet = new Set<number>();
  const daysWithOverdueBillsSet = new Set<number>();
  for (const i of instances) {
    if (!i.due_date) continue;
    const day = parseInt(i.due_date.split("-")[2], 10);
    if (!Number.isInteger(day)) continue;
    daysWithBillsSet.add(day);
    if (!i.paid && i.due_date <= today) {
      daysWithOverdueBillsSet.add(day);
    }
  }
  const daysWithBills = Array.from(daysWithBillsSet).sort((a, b) => a - b);
  const daysWithOverdueBills = Array.from(daysWithOverdueBillsSet).sort(
    (a, b) => a - b
  );

  // Same pattern for income entries: dedupe days with expected dates in
  // this month. Entries with no expected_date contribute nothing to
  // calendar badges.
  const daysWithIncomeSet = new Set<number>();
  for (const i of incomeEntries) {
    if (!i.expected_date) continue;
    const day = parseInt(i.expected_date.split("-")[2], 10);
    if (Number.isInteger(day)) daysWithIncomeSet.add(day);
  }
  const daysWithIncome = Array.from(daysWithIncomeSet).sort((a, b) => a - b);

  // One-off expenses use `date` instead of `due_date`/`expected_date`.
  // Same dedupe/sort pattern. The calendar renders these with the same
  // blue dot as bills (the user wanted bills and expenses to share color).
  const daysWithExpensesSet = new Set<number>();
  for (const e of expenses) {
    if (!e.date) continue;
    const day = parseInt(e.date.split("-")[2], 10);
    if (Number.isInteger(day)) daysWithExpensesSet.add(day);
  }
  const daysWithExpenses = Array.from(daysWithExpensesSet).sort(
    (a, b) => a - b
  );

  const totalBills = instances.reduce(
    (sum, i) => sum + Number(i.amount),
    0
  );
  const paidBills = instances
    .filter((i) => i.paid)
    .reduce((sum, i) => sum + Number(i.amount), 0);
  const remainingBills = totalBills - paidBills;

  // Unpaid bills whose due_date is on or before today. "Net so far" treats
  // these as money that should already be gone from the account, even
  // though the user hasn't ticked them as paid yet.
  const overdueUnpaidBills = instances
    .filter((i) => !i.paid && i.due_date && i.due_date <= today)
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const totalIncome = incomeEntries.reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );
  const receivedIncome = incomeEntries
    .filter((e) => e.received)
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const stillToReceive = totalIncome - receivedIncome;

  const totalExpenses = expenses.reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );

  const netExpected = totalIncome - totalBills - totalExpenses - savingsNet;
  const netSoFar =
    receivedIncome -
    paidBills -
    overdueUnpaidBills -
    totalExpenses -
    savingsNet;

  // Attribution labels for the aggregate view. Only needed when
  // viewing a shared space (spaceIds.length > 1). For personal
  // spaces this is an empty object and components skip attribution.
  const attributions =
    spaceIds.length > 1
      ? await getSpaceAttributions(supabase, spaceIds)
      : {};

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <MonthlyViewClient
        // Remount (and reset highlighted-day state) whenever the URL
        // points at a different month.
        key={`${year}-${month}`}
        spaceId={spaceId}
        year={year}
        month={month}
        monthOptions={monthOptions}
        locked={locked}
        monthId={monthRow.id}
        unlockReason={monthRow.unlock_reason}
        calendar={{
          daysWithBills,
          daysWithOverdueBills,
          daysWithIncome,
          daysWithExpenses,
        }}
        bills={{
          instances,
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
        expenses={{ entries: expenses, total: totalExpenses }}
        balance={{ savingsNet, netExpected, netSoFar }}
        attributions={attributions}
      />
    </div>
  );
}
