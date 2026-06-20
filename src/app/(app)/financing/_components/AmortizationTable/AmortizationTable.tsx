import { brlFormatter } from "@/helpers/format";
import type { Schedule } from "@/helpers/amortization";
import { formatYmd } from "../../_helpers";

type Props = {
  schedule: Schedule;
  // When provided, installments in this set render as paid (highlighted).
  paidNumbers?: Set<number>;
};

// Renders the full amortization table (Nº, data, prestação, juros,
// amortização, [extra], saldo). Presentational — safe to render from both
// server pages and the client simulator.
export default function AmortizationTable({ schedule, paidNumbers }: Props) {
  const hasExtra = schedule.rows.some((r) => r.extraApplied > 0);

  return (
    <div className="max-h-[28rem] overflow-auto rounded-xl border border-subtle">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 bg-surface-2 text-xs text-muted">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Nº</th>
            <th className="px-3 py-2 text-left font-medium">Data</th>
            <th className="px-3 py-2 text-right font-medium">Prestação</th>
            <th className="px-3 py-2 text-right font-medium">Juros</th>
            <th className="px-3 py-2 text-right font-medium">Amortização</th>
            {hasExtra && (
              <th className="px-3 py-2 text-right font-medium">Extra</th>
            )}
            <th className="px-3 py-2 text-right font-medium">Saldo devedor</th>
          </tr>
        </thead>
        <tbody>
          {schedule.rows.map((row) => {
            const paid = paidNumbers?.has(row.number) ?? false;
            return (
              <tr
                key={row.number}
                className={
                  "border-t border-subtle " +
                  (paid ? "bg-accent-soft" : "")
                }
              >
                <td className="px-3 py-1.5 text-muted">{row.number}</td>
                <td className="px-3 py-1.5">{formatYmd(row.date)}</td>
                <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                  {brlFormatter.format(row.payment)}
                </td>
                <td className="px-3 py-1.5 text-right font-mono tabular-nums text-muted">
                  {brlFormatter.format(row.interest)}
                </td>
                <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                  {brlFormatter.format(row.amortization)}
                </td>
                {hasExtra && (
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums text-accent">
                    {row.extraApplied > 0
                      ? brlFormatter.format(row.extraApplied)
                      : "—"}
                  </td>
                )}
                <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                  {brlFormatter.format(row.balanceAfter)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
