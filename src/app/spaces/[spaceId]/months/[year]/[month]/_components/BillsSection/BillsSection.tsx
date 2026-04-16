"use client";

import BillInstanceRow from "../BillInstanceRow/BillInstanceRow";
import { brlFormatter } from "@/helpers/format";
import { spaceBillsUrl } from "@/helpers/paths";
import type { BillsGroup } from "../../_types";

type Props = {
  spaceId: string;
  bills: BillsGroup;
  year: number;
  month: number;
  locked: boolean;
  highlightedDay: number | null;
  attributions: Record<string, string>;
};

export default function BillsSection({
  spaceId,
  bills,
  year,
  month,
  locked,
  highlightedDay,
  attributions,
}: Props) {
  // Pending bills keep the original sort order (by due_date ascending).
  // Paid bills are sorted by amount descending so the biggest payments
  // are easiest to spot at the top.
  const pendingBills = bills.instances.filter((i) => !i.paid);
  const paidBills = [...bills.instances.filter((i) => i.paid)].sort(
    (a, b) => Number(b.amount) - Number(a.amount)
  );

  return (
    <section className="mt-6">
      <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">
        Bills
      </h2>
      {bills.instances.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          No bills this month. Add a recurring template under{" "}
          <a href={spaceBillsUrl(spaceId)} className="underline">
            Bills
          </a>{" "}
          and revisit this page to generate instances.
        </p>
      ) : (
        <>
          {pendingBills.length > 0 && (
            <>
              <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-yellow-700 dark:text-yellow-400">
                Pending ({pendingBills.length})
              </h3>
              <ul className="mt-2 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
                {pendingBills.map((i) => (
                  <BillInstanceRow
                    key={i.id}
                    instance={i}
                    year={year}
                    month={month}
                    locked={locked}
                    highlightedDay={highlightedDay}
                    readOnly={i.space_id !== spaceId}
                    attribution={attributions[i.space_id]}
                  />
                ))}
              </ul>
            </>
          )}

          {paidBills.length > 0 && (
            <>
              <h3 className={`${pendingBills.length > 0 ? "mt-6" : "mt-4"} text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-400`}>
                Paid ({paidBills.length})
              </h3>
              <ul className="mt-2 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
                {paidBills.map((i) => (
                  <BillInstanceRow
                    key={i.id}
                    instance={i}
                    year={year}
                    month={month}
                    locked={locked}
                    highlightedDay={highlightedDay}
                    readOnly={i.space_id !== spaceId}
                    attribution={attributions[i.space_id]}
                  />
                ))}
              </ul>
            </>
          )}

          <dl className="mt-4 grid grid-cols-3 gap-4 rounded-lg border border-gray-200 bg-white p-4 text-sm dark:border-gray-700 dark:bg-gray-800">
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">
                Total bills
              </dt>
              <dd className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                {brlFormatter.format(bills.total)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">
                Paid so far
              </dt>
              <dd className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                {brlFormatter.format(bills.paid)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">
                Still to pay
              </dt>
              <dd className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                {brlFormatter.format(bills.remaining)}
              </dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
}
