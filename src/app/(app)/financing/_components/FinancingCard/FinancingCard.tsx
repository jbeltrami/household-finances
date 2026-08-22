import Link from "next/link";
import Card from "@/components/Card";
import { brlFormatter } from "@/helpers/format";
import { financingDetailUrl } from "@/helpers/paths";
import type { FinancingRow, FinancingSummary } from "@/helpers/financing";
import { systemLabel } from "../../_helpers";

type Props = {
  categoryName?: string | null;
  financing: FinancingRow;
  summary: FinancingSummary;
};

export default function FinancingCard({ categoryName, financing, summary }: Props) {
  const pct =
    summary.total > 0
      ? Math.round((summary.paidCount / summary.total) * 100)
      : 0;

  return (
    <Link href={financingDetailUrl(financing.id)} className="block">
      <Card className="p-5 transition-colors hover:border-accent/40">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-medium text-fg">{financing.name}</h3>
            <p className="mt-0.5 text-xs text-muted">
              {systemLabel(financing.amortization_system)}
              {categoryName ? ` · ${categoryName}` : " · Sem categoria"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">Parcela atual</p>
            <p className="font-mono text-sm tabular-nums text-fg">
              {brlFormatter.format(summary.monthlyPayment)}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>
              {summary.paidCount} de {summary.total} parcelas
            </span>
            <span>{pct}%</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-subtle pt-3 text-sm">
          <span className="text-muted">Saldo devedor</span>
          <span className="font-mono font-medium tabular-nums text-fg">
            {brlFormatter.format(summary.outstandingBalance)}
          </span>
        </div>
      </Card>
    </Link>
  );
}
