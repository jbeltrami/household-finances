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
export type MonthExpense = { amount: number };

// A Receita: expected, and either received or still pending.
export type MonthIncome = { amount: number; received: boolean };

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

  // Two separate filters on purpose — one by paid, one by date. A Conta that
  // is paid and dated in the future belongs to the first and not the second;
  // collapsing them into one pass is how it ends up subtracted twice.
  const overdueUnpaidBills = sum(
    bills.filter((b) => !b.paid && b.date <= ledger.today),
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
