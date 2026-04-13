import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  buildMonthOptions,
  getOrCreateMonth,
  isMonthLocked,
} from "./_helpers";
import MonthlyViewClient, {
  type BillRow,
  type ExpenseRow,
  type IncomeRow,
} from "./_components/MonthlyViewClient/MonthlyViewClient";

type BillInstanceWithTemplate = {
  id: string;
  amount: number | string;
  due_date: string | null;
  paid: boolean;
  recurring_bill_templates: { name: string } | null;
};

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

  const { data: personalSpace } = await supabase
    .from("spaces")
    .select("id")
    .eq("type", "personal")
    .limit(1)
    .single();

  if (!personalSpace) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-red-600 dark:text-red-400">No personal space found.</p>
      </div>
    );
  }

  const monthRow = await getOrCreateMonth(
    supabase,
    personalSpace.id,
    year,
    month
  );

  const locked = isMonthLocked({
    year: monthRow.year,
    month: monthRow.month,
    unlock_reason: monthRow.unlock_reason,
  });

  // Fetch all existing months in this space for the dropdown. RLS ensures
  // we only see the user's own months.
  const { data: existingMonths } = await supabase
    .from("months")
    .select("year, month")
    .eq("space_id", personalSpace.id);

  const monthOptions = buildMonthOptions(existingMonths ?? [], {
    year,
    month,
  });

  // Nested select: pulls each instance plus its template name.
  const { data: rawInstances } = await supabase
    .from("bill_instances")
    .select(
      "id, amount, due_date, paid, recurring_bill_templates(name)"
    )
    .eq("month_id", monthRow.id)
    .order("due_date", { ascending: true, nullsFirst: false });

  const rawWithTemplate = (rawInstances ??
    []) as unknown as BillInstanceWithTemplate[];

  // Flatten the nested template name into a simpler row shape that the
  // client wrapper can pass straight to BillInstanceRow.
  const instances: BillRow[] = rawWithTemplate.map((i) => ({
    id: i.id,
    name: i.recurring_bill_templates?.name ?? "(unnamed)",
    amount: i.amount,
    due_date: i.due_date,
    paid: i.paid,
  }));

  // Income entries for this month. Free-form rows (no template), ordered
  // by expected date with rows that have no date sinking to the bottom.
  const { data: rawIncomeEntries } = await supabase
    .from("income_entries")
    .select("id, name, amount, expected_date, received")
    .eq("month_id", monthRow.id)
    .order("expected_date", { ascending: true, nullsFirst: false });

  const incomeEntries: IncomeRow[] = (rawIncomeEntries ?? []).map((i) => ({
    id: i.id,
    name: i.name,
    amount: i.amount,
    expected_date: i.expected_date,
    received: i.received,
  }));

  // One-off expenses for this month. Free-form rows with optional date,
  // category, and notes. Ordered by date with rows that have no date
  // sinking to the bottom.
  const { data: rawExpenses } = await supabase
    .from("one_off_expenses")
    .select("id, name, amount, date, category, notes")
    .eq("month_id", monthRow.id)
    .order("date", { ascending: true, nullsFirst: false });

  const expenses: ExpenseRow[] = (rawExpenses ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    amount: e.amount,
    date: e.date,
    category: e.category,
    notes: e.notes,
  }));

  // Build the deduped list of days in this month that have bills due.
  // due_date is a "YYYY-MM-DD" string; the third segment is the day. We
  // parse it directly without going through Date() to avoid timezone shifts.
  const daysWithBillsSet = new Set<number>();
  for (const i of instances) {
    if (!i.due_date) continue;
    const day = parseInt(i.due_date.split("-")[2], 10);
    if (Number.isInteger(day)) daysWithBillsSet.add(day);
  }
  const daysWithBills = Array.from(daysWithBillsSet).sort((a, b) => a - b);

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

  const netExpected = totalIncome - totalBills - totalExpenses;
  const netSoFar = receivedIncome - paidBills - totalExpenses;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <MonthlyViewClient
        // Remount (and reset highlighted-day state) whenever the URL
        // points at a different month.
        key={`${year}-${month}`}
        year={year}
        month={month}
        monthOptions={monthOptions}
        daysWithBills={daysWithBills}
        daysWithIncome={daysWithIncome}
        daysWithExpenses={daysWithExpenses}
        locked={locked}
        monthId={monthRow.id}
        unlockReason={monthRow.unlock_reason}
        instances={instances}
        incomeEntries={incomeEntries}
        expenses={expenses}
        totalBills={totalBills}
        paidBills={paidBills}
        remainingBills={remainingBills}
        totalIncome={totalIncome}
        receivedIncome={receivedIncome}
        stillToReceive={stillToReceive}
        totalExpenses={totalExpenses}
        netExpected={netExpected}
        netSoFar={netSoFar}
      />
    </div>
  );
}
