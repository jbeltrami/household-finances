"use client";

import { X } from "lucide-react";
import Card from "@/components/Card";
import { brlFormatter } from "@/helpers/format";
import { formatRangeLabel } from "@/helpers/date";
import type { DayRange } from "@/helpers/day-range";
import {
  summarizeRangeObligations,
  type RangeObligations,
} from "@/helpers/month-summary";
import { capitalize } from "../../_helpers";
import type { BillsGroup } from "../../_types";

type Props = {
  year: number;
  month: number;
  range: DayRange | null;
  bills: BillsGroup;
  // Clearing the selection. The card cannot do it alone — it does not own the
  // Período, and it is the thing that disappears when the Período goes.
  onClear: () => void;
};

// "conta" in the colloquial sense the glossary records, not the strict one.
// The count is over Obrigações, so a Período holding one Conta and one parcela
// de Financiamento reads "2 contas vencem" — which is what a Brazilian says
// about paying the month's bills. Deliberate, not a slip to tighten later.
//
// It needs no "só contas" beneath it either, though the row highlighting below
// lights up Despesas and Receitas that this count leaves out: a Despesa
// records money that already went, so it has no due date to miss, and *vencer*
// is definitionally inapplicable to it. The verb already rules out the reading
// a disclaimer would be defending against.
function contasDue(count: number): string {
  return count === 1 ? "1 conta vence" : `${count} contas vencem`;
}

// "neste dia" for a Período of one day, "neste período" for a span. The
// figures collapse to the single-day case on their own; the wording has to be
// told, because "nada vence neste dia" is false about six of them.
//
// Returned as a bare clause so the card and the live region can each punctuate
// it their own way — one opens a sentence, the other continues one after a
// colon.
function nothingDue(range: DayRange): string {
  return range.from === range.to
    ? "nada vence neste dia"
    : "nada vence neste período";
}

// What the live region says. A sentence rather than a figure, because a
// screen reader user gets no layout to read the labels off — "Pago" beside a
// number is only meaningful if you can see they belong together.
//
// Never returns an empty string. WCAG's guidance on removing status text is
// that clearing a live region is not a status update, so the cleared state
// says so out loud rather than falling silent.
function announcement(
  range: DayRange | null,
  summary: RangeObligations | null,
  label: string | null
): string {
  if (range === null || summary === null || label === null) {
    return "Nenhum período selecionado.";
  }
  if (summary.count === 0) return `${label}: ${nothingDue(range)}.`;

  return (
    `${label}: ${contasDue(summary.count)}, ` +
    `${brlFormatter.format(summary.total)} no total. ` +
    `Pago ${brlFormatter.format(summary.paid)}, ` +
    `falta pagar ${brlFormatter.format(summary.remaining)}.`
  );
}

// What the selected Período owes, beneath Saldo.
//
// A glance, not a record: the card appears while a Período is selected and
// disappears when it is cleared, and nothing anywhere stores it. The figures
// are folded in the browser from rows the page already has, so selecting days
// costs no request and changes no state the server can see.
//
// A Período covering the whole month restates the Contas card's own figure,
// and is left to. Suppressing a correct answer would need a rule that explains
// itself, and there is none.
//
// Red on every figure because they are all aggregates of money going out,
// which is what red means on a figure here — including "Pago", for the same
// reason `Pago até o momento` is red in the Resumo strip. The other red, on a
// row, is Vencida, and this card has no rows to confuse it with.
export default function RangeTotalCard({
  year,
  month,
  range,
  bills,
  onClear,
}: Props) {
  const summary =
    range === null
      ? null
      : summarizeRangeObligations({
          bills: bills.entries,
          financing: { bills: bills.mortgages },
          range,
        });

  const label = range === null ? null : formatRangeLabel(year, month, range);

  return (
    <>
      {/*
        Mounted on every path, including when no Período is selected. A live
        region only announces changes to text inside a container that was
        already there — one rendered alongside its first message announces
        nothing. Absolutely positioned by `sr-only`, so it is not a flex item
        and adds no gap to the column.
      */}
      <p role="status" aria-atomic="true" className="sr-only">
        {announcement(range, summary, label)}
      </p>

      {range === null || summary === null || label === null ? null : (
        <Card className="p-5">
          {/*
            The X is here rather than back on the calendar because clearing is
            the most ordinary thing a user wants next, and from the calendar it
            costs two clicks and a rule to remember: collapse the span to one
            day, then click that day again. Where focus goes when this unmounts
            is the caller's job — see `handleClearRange`.
          */}
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-fg">{label}</h2>
            <button
              type="button"
              onClick={onClear}
              aria-label="Limpar período selecionado"
              data-tooltip="Limpar período"
              className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-fg"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          {summary.count === 0 ? (
            <p className="mt-4 text-sm text-muted">{capitalize(nothingDue(range))}.</p>
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
