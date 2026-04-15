import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { brlFormatter } from "@/helpers/format";
import EditFundNameForm from "./_components/EditFundNameForm/EditFundNameForm";
import CreateContributionForm from "./_components/CreateContributionForm/CreateContributionForm";
import ContributionsSection from "./_components/ContributionsSection/ContributionsSection";
import type { SavingsContributionRow } from "../_types";

type RawContribution = {
  id: string;
  amount: number | string;
  notes: string | null;
  month_id: string;
  months: { year: number; month: number } | null;
};

export default async function SavingsFundDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: fundId } = await params;

  const supabase = await createClient();

  const { data: fund } = await supabase
    .from("savings_funds")
    .select("id, name, currency, starting_balance")
    .eq("id", fundId)
    .single();

  if (!fund) notFound();

  // All contributions for this fund, with their month's year/month
  // flattened for easy grouping. Sorted so the most recent month comes
  // first; within a month, Supabase orders by created_at.
  const { data: rawContributions } = await supabase
    .from("savings_contributions")
    .select("id, amount, notes, month_id, months!inner(year, month)")
    .eq("fund_id", fundId)
    .order("created_at", { ascending: false });

  const rawList = (rawContributions ?? []) as unknown as RawContribution[];

  const contributions: SavingsContributionRow[] = rawList
    .filter((c) => c.months !== null)
    .map((c) => ({
      id: c.id,
      amount: c.amount,
      notes: c.notes,
      month_id: c.month_id,
      year: c.months!.year,
      month: c.months!.month,
    }));

  const totalContributions = contributions.reduce(
    (sum, c) => sum + Number(c.amount),
    0
  );
  const runningTotal = Number(fund.starting_balance) + totalContributions;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/savings"
        className="text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
      >
        ← All funds
      </Link>

      <div className="mt-4">
        <EditFundNameForm fundId={fund.id} currentName={fund.name} />
      </div>

      <dl className="mt-4 flex flex-wrap items-baseline gap-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div>
          <dt className="text-xs text-gray-500 dark:text-gray-400">
            Current total
          </dt>
          <dd className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {brlFormatter.format(runningTotal)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500 dark:text-gray-400">
            Starting balance
          </dt>
          <dd className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {brlFormatter.format(Number(fund.starting_balance))}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500 dark:text-gray-400">
            Net contributions
          </dt>
          <dd
            className={`text-sm font-medium ${
              totalContributions >= 0
                ? "text-green-700 dark:text-green-400"
                : "text-red-700 dark:text-red-400"
            }`}
          >
            {totalContributions >= 0 ? "+" : ""}
            {brlFormatter.format(totalContributions)}
          </dd>
        </div>
      </dl>

      <CreateContributionForm fundId={fund.id} />

      <ContributionsSection contributions={contributions} />
    </div>
  );
}
