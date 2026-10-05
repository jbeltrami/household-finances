import Link from "next/link";
import Card from "@/components/Card";
import { formatShortMonthYear } from "@/helpers/date";
import { brlFormatter } from "@/helpers/format";
import { financingDetailUrl } from "@/helpers/paths";
import type { FinancingOverview } from "@/helpers/financing";

type Props = {
  overview: FinancingOverview;
  // The loan whose page holds the simulator, when there is only one. With
  // several there is no single loan to send the user to.
  onlyFinancingId: string | null;
};

// The overview's figures, every active Financiamento added together. They
// stay neutral: a Saldo devedor or a Total a pagar is a stock, not money
// leaving, so it borrows neither the red of an outflow nor of a Vencida.
//
// Two per row on a phone, with Economia across the full width for its
// longer copy; on wider screens three, then two wider ones.
export default function FinancingOverviewCards({
  overview,
  onlyFinancingId,
}: Props) {
  const { savings } = overview;

  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-6">
      <Figure
        className="sm:col-span-2"
        label="Saldo devedor"
        value={brlFormatter.format(overview.outstandingBalance)}
      />
      <Figure
        className="sm:col-span-2"
        label="Total a pagar"
        value={brlFormatter.format(overview.totalToPay)}
        note={`dos quais ${brlFormatter.format(overview.interestToPay)} em juros`}
      />
      <Figure
        className="sm:col-span-2"
        label="Parcelas deste mês"
        value={brlFormatter.format(overview.installmentsThisMonth)}
      />
      <Figure
        className="sm:col-span-3"
        label="Quitação"
        value={
          overview.payoffMonth
            ? formatShortMonthYear(overview.payoffMonth)
            : "Quitado"
        }
      />
      {savings.hasExtras ? (
        <Figure
          className="col-span-2 sm:col-span-3"
          label="Economia com amortizações"
          value={brlFormatter.format(savings.interestSaved)}
          note={
            savings.installmentsRemoved > 0
              ? `${savings.installmentsRemoved} ${
                  savings.installmentsRemoved === 1 ? "parcela" : "parcelas"
                } a menos`
              : undefined
          }
        />
      ) : (
        <Card className="col-span-2 p-3 sm:col-span-3 sm:p-4">
          <p className="text-xs text-muted">Economia com amortizações</p>
          <p className="mt-1 text-sm text-fg">
            Nenhuma amortização extraordinária ainda
          </p>
          {/* The simulator lives on each loan's own page. */}
          {onlyFinancingId ? (
            <Link
              href={financingDetailUrl(onlyFinancingId)}
              className="mt-1 inline-block text-xs text-accent underline"
            >
              Simule no financiamento
            </Link>
          ) : (
            <p className="mt-1 text-xs text-muted">Simule no financiamento</p>
          )}
        </Card>
      )}
    </div>
  );
}

function Figure({
  className,
  label,
  note,
  value,
}: {
  className: string;
  label: string;
  note?: string;
  value: string;
}) {
  return (
    <Card className={`p-3 sm:p-4 ${className}`}>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-mono text-[15px] font-medium tabular-nums text-fg sm:text-base">
        {value}
      </p>
      {note ? <p className="mt-1 text-xs text-muted">{note}</p> : null}
    </Card>
  );
}
