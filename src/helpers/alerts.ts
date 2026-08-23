import type { MortgageBillItem } from "./financing";
import type { OverdueLedger } from "./month-summary";
import type { ResolvedEntry } from "./types";

// What the daily Aviso is made of.
//
// Pure: rows in, rows out. The hydration lives in the send helper; everything
// here is a mapping, so the two questions the email raises — which Obrigações
// count, and what each one is called — are answerable in a test rather than
// against a live month.

// An Obrigação as the email needs it: the three fields Vencida is decided on,
// plus the name to print. A Conta has a name already; a parcela does not, so
// one gets built.
export type AlertRow = {
  name: string;
  date: string;
  amount: number;
  paid: boolean;
};

// A parcela is the nth payment of a loan and carries no name of its own.
// Without the Financiamento and the position in the term, the email would
// list an unexplained amount on an unexplained date.
function installmentLabel(p: MortgageBillItem): string {
  return `${p.financingName} — parcela ${p.installmentNumber}/${p.installmentsTotal}`;
}

// Assemble the month into the shape summarizeOverdue folds.
//
// `cutoff` is the caller's decision and is passed straight through. The cron
// passes yesterday, so a Conta due today — which still has the whole day to
// be paid — is not reported as late. See isOverdue in month-summary.ts.
//
// On the 1st, yesterday belongs to the month that just locked, and every
// Obrigação in the current month is dated after it. The run finds nothing on
// its own, which is why there is no month-boundary special case here.
export function buildAlertLedger(
  entries: ResolvedEntry[],
  parcelas: MortgageBillItem[],
  cutoff: string
): OverdueLedger<AlertRow> {
  return {
    // Contas only. A one-off entry is a Despesa — money already gone, with no
    // due date to miss — so it is never an Obrigação and never Vencida. The
    // template is what tells the two apart, whether or not the occurrence has
    // been materialized into a row yet.
    bills: entries
      .filter((e) => e.template_id !== null)
      .map((e) => ({
        name: e.name,
        date: e.date,
        amount: e.amount,
        paid: e.paid,
      })),
    financing: {
      bills: parcelas.map((p) => ({
        name: installmentLabel(p),
        date: p.date,
        amount: p.amount,
        paid: p.paid,
      })),
    },
    cutoff,
  };
}
