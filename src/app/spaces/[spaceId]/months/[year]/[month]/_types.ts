import type { YearMonth } from "./_helpers";

// A resolved ledger entry — unified shape for virtual template
// occurrences and materialized rows in `entries`. When id is null,
// the entry is virtual (no DB row yet); mutations on it must
// materialize a row first. See src/helpers/ledger.ts for details.
export type EntryRow = {
  id: string | null;
  space_id: string;
  template_id: string | null;
  date: string;
  name: string;
  amount: number;
  currency: string;
  category: string | null;
  notes: string | null;
  paid: boolean;
  installments_covered: number;
  installmentProgress: {
    paid: number;
    total: number;
    remaining: number;
    defaultAmount: number;
  } | null;
};

export type IncomeRow = {
  id: string;
  space_id: string;
  name: string;
  amount: number;
  expected_date: string;
  received: boolean;
};

export type CalendarGroup = {
  daysWithBills: number[];
  daysWithOverdueBills: number[];
  daysWithIncome: number[];
  daysWithExpenses: number[];
};

// Bills group contains entries whose `template_id` is non-null
// (recurring occurrences — virtual or materialized exceptions).
export type BillsGroup = {
  entries: EntryRow[];
  total: number;
  paid: number;
  remaining: number;
};

export type IncomeGroup = {
  entries: IncomeRow[];
  total: number;
  received: number;
  stillExpected: number;
};

// Expenses group contains entries whose `template_id` is null
// (free-form one-offs).
export type ExpensesGroup = {
  entries: EntryRow[];
  total: number;
};

export type BalanceGroup = {
  savingsNet: number;
  netExpected: number;
  netSoFar: number;
};

export type MonthlyViewProps = {
  spaceId: string;
  year: number;
  month: number;
  monthOptions: YearMonth[];
  locked: boolean;
  unlockReason: string | null;
  calendar: CalendarGroup;
  bills: BillsGroup;
  income: IncomeGroup;
  expenses: ExpensesGroup;
  balance: BalanceGroup;
  attributions: Record<string, string>;
};
