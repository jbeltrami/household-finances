import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { brlFormatter } from "@/helpers/format";
import {
  spaceBillsUrl,
  spaceMonthUrl,
  spaceSavingsUrl,
  spaceSettingsUrl,
} from "@/helpers/paths";
import { getAggregateSpaceIds } from "@/helpers/spaces";

type SpaceRow = {
  id: string;
  name: string;
  type: "personal" | "shared";
};

type MembershipRow = {
  spaces: SpaceRow;
};

type SpaceSummary = SpaceRow & {
  memberCount: number;
  netSoFar: number;
  stillToPay: number;
  savingsNet: number;
  totalSavings: number;
};

// Compute the current-month snapshot for a single space (or its
// aggregate, for shared spaces). Runs 5 small queries in parallel.
async function computeSummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  space: SpaceRow,
  currentYear: number,
  currentMonth: number
): Promise<SpaceSummary> {
  const spaceIds = await getAggregateSpaceIds(supabase, space.id);

  // Month rows for the current period across aggregate spaces.
  const { data: months } = await supabase
    .from("months")
    .select("id")
    .in("space_id", spaceIds)
    .eq("year", currentYear)
    .eq("month", currentMonth);

  const monthIds = (months ?? []).map((m) => m.id);

  // Member count (only meaningful for shared spaces, but cheap either way).
  // Savings funds — query independently of months since funds live outside
  // the monthly cycle. starting_balance + all contributions = running total.
  const [{ count: memberCount }, fundsRes] = await Promise.all([
    supabase
      .from("space_members")
      .select("*", { count: "exact", head: true })
      .eq("space_id", space.id)
      .is("left_at", null),
    supabase
      .from("savings_funds")
      .select("id, starting_balance")
      .in("space_id", spaceIds),
  ]);

  const funds = fundsRes.data ?? [];
  const startingBalanceSum = funds.reduce(
    (s, f) => s + Number(f.starting_balance),
    0
  );

  // All contributions across all funds (not month-scoped).
  let allContributionsSum = 0;
  if (funds.length > 0) {
    const fundIds = funds.map((f) => f.id);
    const { data: allContributions } = await supabase
      .from("savings_contributions")
      .select("amount")
      .in("fund_id", fundIds);
    allContributionsSum = (allContributions ?? []).reduce(
      (s, c) => s + Number(c.amount),
      0
    );
  }
  const totalSavings = startingBalanceSum + allContributionsSum;

  if (monthIds.length === 0) {
    return {
      ...space,
      memberCount: memberCount ?? 1,
      netSoFar: 0,
      stillToPay: 0,
      savingsNet: 0,
      totalSavings,
    };
  }

  // Four entity queries in parallel.
  const [billsRes, incomeRes, expensesRes, savingsRes] = await Promise.all([
    supabase
      .from("bill_instances")
      .select("amount, paid")
      .in("month_id", monthIds),
    supabase
      .from("income_entries")
      .select("amount, received")
      .in("month_id", monthIds),
    supabase
      .from("one_off_expenses")
      .select("amount")
      .in("month_id", monthIds),
    supabase
      .from("savings_contributions")
      .select("amount")
      .in("month_id", monthIds),
  ]);

  const bills = billsRes.data ?? [];
  const paidBills = bills
    .filter((b) => b.paid)
    .reduce((s, b) => s + Number(b.amount), 0);
  const totalBills = bills.reduce((s, b) => s + Number(b.amount), 0);
  const stillToPay = totalBills - paidBills;

  const receivedIncome = (incomeRes.data ?? [])
    .filter((i) => i.received)
    .reduce((s, i) => s + Number(i.amount), 0);

  const totalExpenses = (expensesRes.data ?? []).reduce(
    (s, e) => s + Number(e.amount),
    0
  );

  const savingsNet = (savingsRes.data ?? []).reduce(
    (s, c) => s + Number(c.amount),
    0
  );

  const netSoFar = receivedIncome - paidBills - totalExpenses - savingsNet;

  return {
    ...space,
    memberCount: memberCount ?? 1,
    netSoFar,
    stillToPay,
    savingsNet,
    totalSavings,
  };
}

function colorClass(value: number): string {
  if (value > 0) return "text-green-600 dark:text-green-400";
  if (value < 0) return "text-red-600 dark:text-red-400";
  return "text-gray-900 dark:text-gray-100";
}

export default async function Dashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // All spaces the user is an active member of.
  const { data: rawMemberships } = await supabase
    .from("space_members")
    .select("spaces!inner(id, name, type)")
    .eq("user_id", user.id)
    .is("left_at", null);

  const spaces: SpaceRow[] = (
    (rawMemberships ?? []) as unknown as MembershipRow[]
  )
    .map((m) => m.spaces)
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "personal" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  // Compute current-month summaries in parallel across all spaces.
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const summaries = await Promise.all(
    spaces.map((s) => computeSummary(supabase, s, currentYear, currentMonth))
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Dashboard
      </h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Your spaces at a glance.
      </p>

      <div className="mt-6 space-y-4">
        {summaries.map((s) => (
          <div
            key={s.id}
            className="relative rounded-lg border border-gray-200 bg-white p-5 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600 dark:hover:bg-gray-700"
          >
            {/* Stretched link: clicking anywhere on the card navigates
                to the current month. The deep links below sit above
                this via z-10 so they capture their own clicks. */}
            <Link
              href={spaceMonthUrl(s.id, currentYear, currentMonth)}
              className="absolute inset-0 z-0"
              aria-label={`Open ${s.type === "personal" ? "Personal Space" : s.name}`}
            />

            {/* Header: name + badge */}
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {s.type === "personal" ? "Personal Space" : s.name}
              </h2>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  s.type === "shared"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                }`}
              >
                {s.type === "shared" ? "Shared" : "Personal"}
              </span>
              {s.type === "shared" && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {s.memberCount} {s.memberCount === 1 ? "member" : "members"}
                </span>
              )}
            </div>

            {/* Summary numbers */}
            <dl className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400">
                  Net so far
                </dt>
                <dd
                  className={`mt-0.5 font-semibold ${colorClass(s.netSoFar)}`}
                >
                  {brlFormatter.format(s.netSoFar)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400">
                  Still to pay
                </dt>
                <dd className="mt-0.5 font-semibold text-gray-900 dark:text-gray-100">
                  {brlFormatter.format(s.stillToPay)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400">
                  Saved this month
                </dt>
                <dd
                  className={`mt-0.5 font-semibold ${
                    s.savingsNet > 0
                      ? "text-gray-900 dark:text-gray-100"
                      : s.savingsNet < 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {brlFormatter.format(s.savingsNet)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400">
                  Total savings
                </dt>
                <dd
                  className={`mt-0.5 font-semibold ${colorClass(s.totalSavings)}`}
                >
                  {brlFormatter.format(s.totalSavings)}
                </dd>
              </div>
            </dl>

            {/* Deep links — z-10 so they sit above the stretched card link */}
            <div className="relative z-10 mt-4 flex items-center gap-4 text-xs font-medium">
              <Link
                href={spaceMonthUrl(s.id, currentYear, currentMonth)}
                className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
              >
                This month &rarr;
              </Link>
              <Link
                href={spaceBillsUrl(s.id)}
                className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
              >
                Bills &rarr;
              </Link>
              <Link
                href={spaceSavingsUrl(s.id)}
                className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
              >
                Savings &rarr;
              </Link>
              {s.type === "shared" && (
                <Link
                  href={spaceSettingsUrl(s.id)}
                  className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
                >
                  Settings &rarr;
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <Link
          href="/spaces/new"
          className="rounded-md border border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800"
        >
          + Create shared space
        </Link>
      </div>
    </div>
  );
}
