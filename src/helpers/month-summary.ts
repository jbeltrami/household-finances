import { dayOfMonthFromYmd } from "./date";

// The month's figures: Saldo and the Resumo strip.
//
// These are what the app is for, and until now they had no module. They
// were computed inline while the monthly page rendered, re-derived in the
// report, and computed a third way for the Insights averages — where
// Financiamento was left out, so the same household read one Contas figure
// on the monthly view and a smaller one on Insights.
//
// Pure: rows in, numbers out. No Supabase, no clock — `today` arrives as an
// argument so a report generated for a past month can be summarised as of
// the right day rather than as of now.
//
// The inputs are structural minimums rather than the full row types, the
// same way `SpendEntry` is in category-reports.ts: a Conta from `entries`, a
// parcela computed from loan parameters and a line already flattened for the
// PDF are three different shapes that agree on the three fields that matter.

// A Conta: an obligation with a due date that is either settled or not.
export type MonthBill = { date: string; amount: number; paid: boolean };

// A Despesa: money already gone, so it carries no paid state.
export type MonthExpense = { date: string; amount: number };

// A Receita: expected on a date, and either received or still pending.
export type MonthIncome = {
  expected_date: string;
  amount: number;
  received: boolean;
};

// Everything a month is made of. Financiamento is a required field rather
// than an optional one: a caller that does not want parcelas counted has to
// say so by passing empty lists, which is the difference between a decision
// and the omission that put Insights out of step in the first place.
export type MonthLedger = {
  bills: MonthBill[];
  expenses: MonthExpense[];
  income: MonthIncome[];
  financing: { bills: MonthBill[]; expenses: MonthExpense[] };
  // "YYYY-MM-DD". Compared as a string against each Conta's date, which is
  // calendar comparison with no Date construction and no UTC-midnight shift.
  today: string;
};

// Which days of the month carry a dot on the calendar. Same question as
// the totals, asked per day rather than per month, which is why it reads
// the same ledger rather than a second assembly of the same rows.
export type MonthDayMarkers = {
  daysWithBills: number[];
  daysWithOverdueBills: number[];
  daysWithIncome: number[];
  daysWithExpenses: number[];
};

export type MonthTotals = {
  bills: { total: number; paid: number; remaining: number };
  income: { total: number; received: number; stillExpected: number };
  expenses: { total: number };
  balance: { netExpected: number; netSoFar: number };
};

function sum<T>(rows: T[], amount: (row: T) => number): number {
  return rows.reduce((total, row) => total + amount(row), 0);
}

const amountOf = (row: { amount: number }) => row.amount;

// Is this Obrigação Vencida as of `cutoff` — due by then and still unpaid?
//
// The one definition, with the boundary left to the caller, because the two
// questions the app asks want different boundaries and both are right:
//
//   Saldo and the calendar dots pass today. A Conta due today is money
//   leaving the account today, and its day is red on the day it is due.
//
//   The daily Aviso passes yesterday. At 08:00 a Conta due today still has
//   the whole day to be paid, so reporting it as late would be false.
//
// Collapsing those into one hardcoded comparison is how the Aviso ends up
// nagging about bills that are not late yet, or Saldo stops counting money
// that is already gone. The predicate is shared; the cutoff is a decision.
//
// String comparison, not Date: Postgres hands back "YYYY-MM-DD" and that
// format sorts lexicographically, so there is no timezone to get wrong.
export function isVencida(bill: MonthBill, cutoff: string): boolean {
  return !bill.paid && bill.date <= cutoff;
}

export function summarizeMonth(ledger: MonthLedger): MonthTotals {
  // A parcela behaves like a Conta for the month and an amortização
  // extraordinária like a Despesa, which is how the monthly view has always
  // presented them.
  const bills = [...ledger.bills, ...ledger.financing.bills];
  const expenses = [...ledger.expenses, ...ledger.financing.expenses];

  const totalBills = sum(bills, amountOf);
  const paidBills = sum(
    bills.filter((b) => b.paid),
    amountOf
  );

  const totalIncome = sum(ledger.income, amountOf);
  const receivedIncome = sum(
    ledger.income.filter((i) => i.received),
    amountOf
  );

  const totalExpenses = sum(expenses, amountOf);

  // Two separate folds on purpose — one by paid, one by Vencida. A Conta that
  // is paid and dated in the future belongs to the first and not the second;
  // collapsing them into one pass is how it ends up subtracted twice.
  const overdueUnpaidBills = sum(
    bills.filter((b) => isVencida(b, ledger.today)),
    amountOf
  );

  return {
    bills: {
      total: totalBills,
      paid: paidBills,
      remaining: totalBills - paidBills,
    },
    income: {
      total: totalIncome,
      received: receivedIncome,
      stillExpected: totalIncome - receivedIncome,
    },
    expenses: { total: totalExpenses },
    balance: {
      netExpected: totalIncome - totalBills - totalExpenses,
      // Money that should already have left the account: what was paid, plus
      // what was due and wasn't. Despesas are all already gone by definition.
      netSoFar:
        receivedIncome - paidBills - overdueUnpaidBills - totalExpenses,
    },
  };
}

// What the daily Aviso reports. Same question as `netSoFar` asks, answered
// with the rows themselves rather than one number, because the email names
// each Obrigação instead of only counting them.
//
// Generic over the row so the caller keeps its own shape: a Conta arrives
// from `entries` and a parcela is computed from loan parameters, and the two
// only agree on the three fields here. Whatever extra a caller attaches —
// a name, an id — comes back untouched.
//
// `financing` is required for the same reason it is on MonthLedger: a caller
// that means to leave parcelas out has to say so with an empty list.
export type OverdueLedger<T extends MonthBill> = {
  bills: T[];
  financing: { bills: T[] };
  // Not `today`: the Aviso passes yesterday, and a field called `today`
  // holding yesterday is how the boundary quietly goes wrong.
  cutoff: string;
};

export type OverdueSummary<T extends MonthBill> = {
  rows: T[];
  count: number;
  total: number;
};

export function summarizeOverdue<T extends MonthBill>(
  ledger: OverdueLedger<T>
): OverdueSummary<T> {
  const rows = [...ledger.bills, ...ledger.financing.bills]
    .filter((b) => isVencida(b, ledger.cutoff))
    // Oldest first: whatever has been outstanding longest reads first.
    .sort((a, b) => a.date.localeCompare(b.date));

  return { rows, count: rows.length, total: sum(rows, amountOf) };
}

function sortedDays(days: Set<number>): number[] {
  return Array.from(days).sort((a, b) => a - b);
}

export function monthDayMarkers(ledger: MonthLedger): MonthDayMarkers {
  const withBills = new Set<number>();
  const overdue = new Set<number>();
  const withIncome = new Set<number>();
  const withExpenses = new Set<number>();

  for (const b of [...ledger.bills, ...ledger.financing.bills]) {
    const day = dayOfMonthFromYmd(b.date);
    if (day == null) continue;
    withBills.add(day);
    // The app's one urgency signal, and it belongs to Obrigações alone: a
    // Despesa records money that already went, so it can never be late.
    if (isVencida(b, ledger.today)) overdue.add(day);
  }

  for (const e of [...ledger.expenses, ...ledger.financing.expenses]) {
    const day = dayOfMonthFromYmd(e.date);
    if (day != null) withExpenses.add(day);
  }

  for (const i of ledger.income) {
    const day = dayOfMonthFromYmd(i.expected_date);
    if (day != null) withIncome.add(day);
  }

  return {
    daysWithBills: sortedDays(withBills),
    daysWithOverdueBills: sortedDays(overdue),
    daysWithIncome: sortedDays(withIncome),
    daysWithExpenses: sortedDays(withExpenses),
  };
}
