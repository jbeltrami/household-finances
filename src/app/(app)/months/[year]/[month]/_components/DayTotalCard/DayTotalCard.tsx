import Card from "@/components/Card";
import { brlFormatter } from "@/helpers/format";
import { formatDayLabel } from "@/helpers/date";
import {
  summarizeDayObligations,
  type DayObligations,
} from "@/helpers/month-summary";
import type { BillsGroup } from "../../_types";

type Props = {
  year: number;
  month: number;
  day: number | null;
  bills: BillsGroup;
};

// "conta" in the colloquial sense the glossary records, not the strict one.
// The count is over Obrigações, so a day holding one Conta and one parcela de
// Financiamento reads "2 contas vencem" — which is what a Brazilian says about
// paying the month's bills. Deliberate, not a slip to tighten later.
function contasDue(count: number): string {
  return count === 1 ? "1 conta vence" : `${count} contas vencem`;
}

// What the live region says. A sentence rather than a figure, because a
// screen reader user gets no layout to read the labels off — "Pago" beside a
// number is only meaningful if you can see they belong together.
//
// Never returns an empty string. WCAG's guidance on removing status text is
// that clearing a live region is not a status update, so the cleared state
// says so out loud rather than falling silent.
function announcement(
  label: string | null,
  summary: DayObligations | null
): string {
  if (label === null || summary === null) return "Nenhum dia selecionado.";
  if (summary.count === 0) return `${label}: nada vence neste dia.`;

  return (
    `${label}: ${contasDue(summary.count)}, ` +
    `${brlFormatter.format(summary.total)} no total. ` +
    `Pago ${brlFormatter.format(summary.paid)}, ` +
    `falta pagar ${brlFormatter.format(summary.remaining)}.`
  );
}

// What the selected day owes, beneath Saldo.
//
// A glance, not a record: the card appears while a day is selected and
// disappears when the day is cleared, and nothing anywhere stores it. The
// figures are folded in the browser from rows the page already has, so
// selecting a day costs no request and changes no state the server can see.
//
// Red on every figure because they are all aggregates of money going out,
// which is what red means on a figure here — including "Pago", for the same
// reason `Pago até o momento` is red in the Resumo strip. The other red, on a
// row, is Vencida, and this card has no rows to confuse it with.
export default function DayTotalCard({ year, month, day, bills }: Props) {
  const summary =
    day === null
      ? null
      : summarizeDayObligations({
          bills: bills.entries,
          financing: { bills: bills.mortgages },
          day,
        });

  const label = day === null ? null : formatDayLabel(year, month, day);

  return (
    <>
      {/*
        Mounted on every path, including when no day is selected. A live
        region only announces changes to text inside a container that was
        already there — one rendered alongside its first message announces
        nothing. Absolutely positioned by `sr-only`, so it is not a flex item
        and adds no gap to the column.
      */}
      <p role="status" aria-atomic="true" className="sr-only">
        {announcement(label, summary)}
      </p>

      {summary === null || label === null ? null : (
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-fg">{label}</h2>

          {summary.count === 0 ? (
            <p className="mt-4 text-sm text-muted">Nada vence neste dia.</p>
          ) : (
            <>
              <p className="mt-4 text-xs text-muted">
                {contasDue(summary.count)}
              </p>
              <p className="mt-1 text-2xl font-semibold text-danger">
                {brlFormatter.format(summary.total)}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-4 border-t border-subtle pt-4">
                <div>
                  <p className="text-xs text-muted">Pago</p>
                  <p className="mt-1 text-lg font-semibold text-danger">
                    {brlFormatter.format(summary.paid)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">Falta pagar</p>
                  <p className="mt-1 text-lg font-semibold text-danger">
                    {brlFormatter.format(summary.remaining)}
                  </p>
                </div>
              </div>
            </>
          )}
        </Card>
      )}
    </>
  );
}
