import { createClient } from "@/lib/supabase/server";
import CreateSavingsFundForm from "./_components/CreateSavingsFundForm/CreateSavingsFundForm";
import FundsListSection from "./_components/FundsListSection/FundsListSection";
import type { SavingsFundRow } from "./_types";

type FundWithContributions = {
  id: string;
  name: string;
  currency: string;
  starting_balance: number | string;
  savings_contributions: { amount: number | string }[] | null;
};

export default async function SavingsPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  const supabase = await createClient();

  // Nested select pulls each fund together with every contribution's
  // amount. We sum in JS to build the running total — a DB aggregate
  // would be faster but is overkill at this scale (a handful of funds
  // per space) and complicates RLS reasoning.
  const { data: rawFunds } = await supabase
    .from("savings_funds")
    .select(
      "id, name, currency, starting_balance, savings_contributions(amount)"
    )
    .eq("space_id", spaceId)
    .order("name");

  const rows = (rawFunds ?? []) as unknown as FundWithContributions[];

  const funds: SavingsFundRow[] = rows.map((f) => {
    const totalContributions = (f.savings_contributions ?? []).reduce(
      (sum, c) => sum + Number(c.amount),
      0
    );
    return {
      id: f.id,
      name: f.name,
      currency: f.currency,
      starting_balance: f.starting_balance,
      totalContributions,
      runningTotal: Number(f.starting_balance) + totalContributions,
    };
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Savings
      </h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Funds live outside the monthly cycle. Contributions are logged per
        month and roll up into each fund&rsquo;s running total.
      </p>

      <CreateSavingsFundForm spaceId={spaceId} />

      <FundsListSection spaceId={spaceId} funds={funds} />
    </div>
  );
}
