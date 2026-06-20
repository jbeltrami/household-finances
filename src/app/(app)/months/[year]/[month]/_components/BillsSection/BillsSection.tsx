"use client";

import Link from "next/link";
import Card from "@/components/Card";
import BillInstanceRow from "../BillInstanceRow/BillInstanceRow";
import MortgageBillRow from "../MortgageBillRow/MortgageBillRow";
import { brlFormatter } from "@/helpers/format";
import { billsUrl } from "@/helpers/paths";
import type { BillsGroup, EntryRow, MortgageBillItem } from "../../_types";

type Props = {
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

function BillsSubsection({
  label,
  entries,
  mortgages,
  total,
  year,
  month,
  locked,
  highlightedDay,
}: {
  label: string;
  entries: EntryRow[];
  mortgages: MortgageBillItem[];
  total: number;
  year: number;
  month: number;
  locked: boolean;
  highlightedDay: number | null;
}) {
  if (entries.length === 0 && mortgages.length === 0) return null;
  return (
    <div className="mt-4">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </h3>
      <ul className="mt-2 divide-y divide-subtle">
        {mortgages.map((m) => (
          <MortgageBillRow
            key={`fin-${m.financingId}-${m.installmentNumber}`}
            item={m}
            locked={locked}
            highlightedDay={highlightedDay}
          />
        ))}
        {entries.map((e) => (
          <BillInstanceRow
            key={keyFor(e)}
            entry={e}
            year={year}
            month={month}
            locked={locked}
            highlightedDay={highlightedDay}
          />
        ))}
        <li className="mt-2 flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2.5 text-sm font-semibold text-fg">
          <span>Total</span>
          <span className="text-danger">{brlFormatter.format(total)}</span>
        </li>
      </ul>
    </div>
  );
}

export default function BillsSection({
  bills,
  year,
  month,
  locked,
  highlightedDay,
}: Props) {
  const pendingEntries = bills.entries.filter((e) => !e.paid);
  const paidEntries = bills.entries.filter((e) => e.paid);
  const pendingMortgages = bills.mortgages.filter((m) => !m.paid);
  const paidMortgages = bills.mortgages.filter((m) => m.paid);

  const isEmpty = bills.entries.length === 0 && bills.mortgages.length === 0;

  return (
    <Card className="p-5">
      <h2 className="text-base font-medium text-fg">Contas</h2>
      <p className="mt-1 text-3xl font-bold text-danger">
        {brlFormatter.format(bills.total)}
      </p>

      {isEmpty ? (
        <p className="mt-4 text-sm text-muted">
          Sem contas neste mês. Cadastre uma conta recorrente em{" "}
          <Link href={billsUrl()} className="text-accent underline">
            Contas
          </Link>
          .
        </p>
      ) : (
        <>
          <BillsSubsection
            label="Pendente"
            entries={pendingEntries}
            mortgages={pendingMortgages}
            total={bills.remaining}
            year={year}
            month={month}
            locked={locked}
            highlightedDay={highlightedDay}
          />
          <BillsSubsection
            label="Pago"
            entries={paidEntries}
            mortgages={paidMortgages}
            total={bills.paid}
            year={year}
            month={month}
            locked={locked}
            highlightedDay={highlightedDay}
          />
        </>
      )}
    </Card>
  );
}
