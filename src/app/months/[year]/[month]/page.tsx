import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateMonth, isMonthLocked } from "./_helpers";
import BillInstanceRow from "./BillInstanceRow";
import MonthNavigation from "./MonthNavigation";
import UnlockBanner from "./UnlockBanner";

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

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

  // Nested select: pulls each instance plus its template name.
  const { data: rawInstances } = await supabase
    .from("bill_instances")
    .select(
      "id, amount, due_date, paid, recurring_bill_templates(name)"
    )
    .eq("month_id", monthRow.id)
    .order("due_date", { ascending: true, nullsFirst: false });

  const instances = (rawInstances ?? []) as unknown as BillInstanceWithTemplate[];

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
      <MonthNavigation year={year} month={month} />

      {locked && (
        <UnlockBanner monthId={monthRow.id} year={year} month={month} />
      )}

      {!locked && monthRow.unlock_reason && (
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Unlocked: {monthRow.unlock_reason}
        </p>
      )}

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
                  instance={{
                    id: i.id,
                    name: i.recurring_bill_templates?.name ?? "(unnamed)",
                    amount: i.amount,
                    due_date: i.due_date,
                    paid: i.paid,
                  }}
                  year={year}
                  month={month}
                  locked={locked}
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
    </div>
  );
}
