import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { brlFormatter } from "@/helpers/format";
import { getMonthRange, todayYmd } from "@/helpers/date";
import { getEntriesForMonth } from "@/helpers/ledger";
import {
  spaceBillsUrl,
  spaceMonthUrl,
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
};

async function computeSummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  space: SpaceRow,
  currentYear: number,
  currentMonth: number
): Promise<SpaceSummary> {
  const spaceIds = await getAggregateSpaceIds(supabase, space.id);

  const { count: memberCount } = await supabase
    .from("space_members")
    .select("*", { count: "exact", head: true })
    .eq("space_id", space.id)
    .is("left_at", null);

  // Resolved entries for the current month (virtual + materialized).
  const entries = await getEntriesForMonth(
    supabase,
    spaceIds,
    currentYear,
    currentMonth
  );

  const today = todayYmd();
  const billEntries = entries.filter((e) => e.template_id != null);
  const expenseEntries = entries.filter((e) => e.template_id == null);

  const totalBills = billEntries.reduce((s, e) => s + e.amount, 0);
  const paidBills = billEntries
    .filter((e) => e.paid)
    .reduce((s, e) => s + e.amount, 0);
  const overdueUnpaidBills = billEntries
    .filter((e) => !e.paid && e.date <= today)
    .reduce((s, e) => s + e.amount, 0);
  const stillToPay = totalBills - paidBills;

  // Income in the current month by date range.
  const { start, end } = getMonthRange(currentYear, currentMonth);
  const { data: rawIncome } = await supabase
    .from("income_entries")
    .select("amount, received")
    .in("space_id", spaceIds)
    .gte("expected_date", start)
    .lte("expected_date", end);

  const receivedIncome = (rawIncome ?? [])
    .filter((i) => i.received)
    .reduce((s, i) => s + Number(i.amount), 0);

  const totalExpenses = expenseEntries.reduce((s, e) => s + e.amount, 0);

  const netSoFar =
    receivedIncome - paidBills - overdueUnpaidBills - totalExpenses;

  return {
    ...space,
    memberCount: memberCount ?? 1,
    netSoFar,
    stillToPay,
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
            <Link
              href={spaceMonthUrl(s.id, currentYear, currentMonth)}
              className="absolute inset-0 z-0"
              aria-label={`Open ${s.type === "personal" ? "Personal Space" : s.name}`}
            />

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

            <dl className="mt-3 grid grid-cols-2 gap-4 text-sm">
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
            </dl>

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
