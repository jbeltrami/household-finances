import SavingsFundRow from "../SavingsFundRow/SavingsFundRow";
import type { SavingsFundRow as Row } from "../../_types";

type Props = {
  funds: Row[];
};

export default function FundsListSection({ funds }: Props) {
  if (funds.length === 0) {
    return (
      <section className="mt-8">
        <p className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          No savings funds yet. Create one to start tracking.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">
        Your funds
      </h2>
      <div className="mt-3 space-y-3">
        {funds.map((fund) => (
          <SavingsFundRow key={fund.id} fund={fund} />
        ))}
      </div>
    </section>
  );
}
