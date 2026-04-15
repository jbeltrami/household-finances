import Link from "next/link";
import { brlFormatter } from "@/helpers/format";
import { spaceFundUrl } from "@/helpers/paths";
import type { SavingsFundRow as Row } from "../../_types";

type Props = {
  spaceId: string;
  fund: Row;
};

// A card that summarizes one fund and links to its detail page. The
// running total is the headline figure; starting balance and total
// contributions are shown as supporting context.
export default function SavingsFundRow({ spaceId, fund }: Props) {
  return (
    <Link
      href={spaceFundUrl(spaceId, fund.id)}
      className="block rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600 dark:hover:bg-gray-700"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="min-w-0 truncate text-base font-medium text-gray-900 dark:text-gray-100">
          {fund.name}
        </h3>
        <span className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {brlFormatter.format(fund.runningTotal)}
        </span>
      </div>
      <dl className="mt-2 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
        <div>
          <dt className="inline">Starting: </dt>
          <dd className="inline font-medium text-gray-700 dark:text-gray-300">
            {brlFormatter.format(Number(fund.starting_balance))}
          </dd>
        </div>
        <div>
          <dt className="inline">Contributions: </dt>
          <dd
            className={`inline font-medium ${
              fund.totalContributions >= 0
                ? "text-green-700 dark:text-green-400"
                : "text-red-700 dark:text-red-400"
            }`}
          >
            {fund.totalContributions >= 0 ? "+" : ""}
            {brlFormatter.format(fund.totalContributions)}
          </dd>
        </div>
      </dl>
    </Link>
  );
}
