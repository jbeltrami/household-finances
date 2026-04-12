import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  buildMonthOptions,
  getOrCreateMonth,
  isMonthLocked,
} from "./_helpers";
import MonthlyViewClient, {
  type BillRow,
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

  const totalBills = instances.reduce(
    (sum, i) => sum + Number(i.amount),
    0
  );
  const paidBills = instances
    .filter((i) => i.paid)
    .reduce((sum, i) => sum + Number(i.amount), 0);
  const remainingBills = totalBills - paidBills;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <MonthlyViewClient
        // Remount (and reset highlighted-day state) whenever the URL
        // points at a different month.
        key={`${year}-${month}`}
        year={year}
        month={month}
        monthOptions={monthOptions}
        daysWithBills={daysWithBills}
        locked={locked}
        monthId={monthRow.id}
        unlockReason={monthRow.unlock_reason}
        instances={instances}
        totalBills={totalBills}
        paidBills={paidBills}
        remainingBills={remainingBills}
      />
    </div>
  );
}
