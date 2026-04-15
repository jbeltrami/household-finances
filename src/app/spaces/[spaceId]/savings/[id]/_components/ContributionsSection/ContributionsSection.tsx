import {
  capitalize,
  formatMonthLabel,
} from "@/app/spaces/[spaceId]/months/[year]/[month]/_helpers";
import ContributionRow from "../ContributionRow/ContributionRow";
import type { SavingsContributionRow } from "../../../_types";

type MonthGroup = {
  year: number;
  month: number;
  contributions: SavingsContributionRow[];
};

type Props = {
  contributions: SavingsContributionRow[];
};

// Group contributions by month for display. Months render most-recent
// first; contributions within a month keep their fetch order.
function groupByMonth(rows: SavingsContributionRow[]): MonthGroup[] {
  const byKey = new Map<string, MonthGroup>();
  for (const c of rows) {
    const key = `${c.year}-${c.month}`;
    let group = byKey.get(key);
    if (!group) {
      group = { year: c.year, month: c.month, contributions: [] };
      byKey.set(key, group);
    }
    group.contributions.push(c);
  }
  return Array.from(byKey.values()).sort(
    (a, b) => b.year - a.year || b.month - a.month
  );
}

export default function ContributionsSection({ contributions }: Props) {
  if (contributions.length === 0) {
    return (
      <section className="mt-8">
        <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">
          History
        </h2>
        <p className="mt-3 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          No contributions yet. Log your first deposit above.
        </p>
      </section>
    );
  }

  const groups = groupByMonth(contributions);

  return (
    <section className="mt-8">
      <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">
        History
      </h2>
      <div className="mt-3 space-y-4">
        {groups.map((g) => (
          <div key={`${g.year}-${g.month}`}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {capitalize(formatMonthLabel(g.year, g.month))}
            </h3>
            <ul className="mt-2 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
              {g.contributions.map((c) => (
                <ContributionRow key={c.id} contribution={c} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
