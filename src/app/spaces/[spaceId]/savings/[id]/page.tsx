import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { brlFormatter } from "@/helpers/format";
import { spaceSavingsUrl } from "@/helpers/paths";
import EditFundNameForm from "./_components/EditFundNameForm/EditFundNameForm";
import CreateContributionForm from "./_components/CreateContributionForm/CreateContributionForm";
import ContributionsSection from "./_components/ContributionsSection/ContributionsSection";
import type { SavingsContributionRow } from "../_types";

export default async function SavingsFundDetailPage({
  params,
}: {
  params: Promise<{ spaceId: string; id: string }>;
}) {
  const { spaceId, id: fundId } = await params;

  const supabase = await createClient();

  const { data: fund } = await supabase
    .from("savings_funds")
    .select("id, name, currency, starting_balance")
    .eq("id", fundId)
    .single();

  if (!fund) notFound();

  // Date-keyed contributions. Newest first via `date` descending;
  // within a day, created_at breaks ties.
  const { data: rawContributions } = await supabase
    .from("savings_contributions")
    .select("id, amount, notes, date")
    .eq("fund_id", fundId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  const contributions: SavingsContributionRow[] = (rawContributions ?? []).map(
    (c) => ({
      id: c.id,
      amount: c.amount,
      notes: c.notes,
      date: c.date,
    })
  );

  const totalContributions = contributions.reduce(
    (sum, c) => sum + Number(c.amount),
    0
  );
  const runningTotal = Number(fund.starting_balance) + totalContributions;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href={spaceSavingsUrl(spaceId)}
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
