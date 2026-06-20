import { brlFormatter } from "@/helpers/format";
import type { Schedule } from "@/helpers/amortization";
import { formatYmd } from "../../_helpers";

type Props = {
  schedule: Schedule;
  // When provided, installments in this set render as paid (highlighted).
  paidNumbers?: Set<number>;
  // When provided, each row shows a clickable Pago/Pendente toggle (used on
  // the financing detail page to mark installments paid, incl. backfilling
  // past months). togglePending disables the controls while a write is in
  // flight.
  onTogglePaid?: (installmentNumber: number, date: string, newPaid: boolean) => void;
  togglePending?: boolean;
};

// Renders the full amortization table (Nº, data, prestação, juros,
// amortização, [extra], saldo, [status]). Presentational — safe to render
// from both server pages and the client simulator.
export default function AmortizationTable({
  schedule,
  paidNumbers,
  onTogglePaid,
  togglePending,
}: Props) {
  const hasExtra = schedule.rows.some((r) => r.extraApplied > 0);
  const interactive = onTogglePaid != null;

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
            {interactive && (
              <th className="px-3 py-2 text-right font-medium">Status</th>
            )}
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
                {interactive && (
                  <td className="px-3 py-1.5 text-right">
                    <button
                      type="button"
                      onClick={() => onTogglePaid!(row.number, row.date, !paid)}
                      disabled={togglePending}
                      className={
                        (paid ? "pill-paid" : "pill-pending") +
                        " transition-opacity hover:opacity-80 disabled:opacity-50"
                      }
                      title={paid ? "Marcar como pendente" : "Marcar como paga"}
                    >
                      {paid ? "Pago" : "Pendente"}
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
