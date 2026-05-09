"use client";

import { brlFormatter } from "@/helpers/format";
import type { BalanceGroup } from "../../_types";

type Props = {
  balance: BalanceGroup;
};

function colorClass(value: number): string {
  if (value > 0) return "text-green-600 dark:text-green-400";
  if (value < 0) return "text-red-600 dark:text-red-400";
  return "text-gray-900 dark:text-gray-100";
}

export default function BalanceSection({ balance }: Props) {
  return (
    <section className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-700">
      <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">
        Balance
      </h2>
      <dl className="mt-4 space-y-2 rounded-lg border border-gray-200 bg-white p-4 text-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-baseline justify-between">
          <dt className="text-gray-600 dark:text-gray-400">Expected net</dt>
          <dd className={`text-lg font-semibold ${colorClass(balance.netExpected)}`}>
            {brlFormatter.format(balance.netExpected)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt className="text-gray-600 dark:text-gray-400">Net so far</dt>
          <dd className={`text-lg font-semibold ${colorClass(balance.netSoFar)}`}>
            {brlFormatter.format(balance.netSoFar)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
