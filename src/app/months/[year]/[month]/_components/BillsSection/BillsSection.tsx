"use client";

import Link from "next/link";
import Card from "@/components/Card";
import BillInstanceRow from "../BillInstanceRow/BillInstanceRow";
import { billsUrl } from "@/helpers/paths";
import type { BillsGroup } from "../../_types";

type Props = {
  spaceId: string;
  bills: BillsGroup;
  year: number;
  month: number;
  locked: boolean;
  highlightedDay: number | null;
};

// Materialized entries use their id; virtual entries have no id so we
// fall back to template+date (unique per month by partial unique index).
function keyFor(entry: {
  id: string | null;
  template_id: string | null;
  date: string;
}) {
  return entry.id ?? `virtual-${entry.template_id}-${entry.date}`;
}

export default function BillsSection({
  bills,
  year,
  month,
  locked,
  highlightedDay,
}: Props) {
  // Order: pending bills first (by due-date ascending — already sorted by
  // the ledger fetch), then paid bills last. Flat list, no headers — the
  // status pill on each row already communicates state.
  const ordered = [
    ...bills.entries.filter((e) => !e.paid),
    ...bills.entries.filter((e) => e.paid),
  ];

  return (
    <Card className="p-5">
      <h2 className="text-base font-medium text-fg">Contas</h2>

      {bills.entries.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          Sem contas neste mês. Cadastre uma conta recorrente em{" "}
          <Link href={billsUrl()} className="text-accent underline">
            Contas
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-subtle">
          {ordered.map((e) => (
            <BillInstanceRow
              key={keyFor(e)}
              entry={e}
              year={year}
              month={month}
              locked={locked}
              highlightedDay={highlightedDay}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}
