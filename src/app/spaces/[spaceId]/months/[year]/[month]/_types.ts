import type { YearMonth } from "./_helpers";

export type BillRow = {
  id: string;
  space_id: string;
  name: string;
  amount: number | string;
  due_date: string | null;
  paid: boolean;
};

export type IncomeRow = {
  id: string;
  space_id: string;
  name: string;
  amount: number | string;
  expected_date: string | null;
  received: boolean;
};

export type ExpenseRow = {
  id: string;
  space_id: string;
  name: string;
  amount: number | string;
  date: string | null;
  category: string | null;
  notes: string | null;
};

export type CalendarGroup = {
  daysWithBills: number[];
  daysWithOverdueBills: number[];
  daysWithIncome: number[];
  daysWithExpenses: number[];
};

export type BillsGroup = {
  instances: BillRow[];
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

export type ExpensesGroup = {
  entries: ExpenseRow[];
  total: number;
};

export type BalanceGroup = {
  // Net change in savings for this month: positive = deposits net of
  // withdrawals, negative = withdrawals net of deposits. Subtracted from
  // both netExpected and netSoFar so the totals reflect the cash reality
  // after the savings moves happen.
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
  monthId: string;
  unlockReason: string | null;
  calendar: CalendarGroup;
  bills: BillsGroup;
  income: IncomeGroup;
  expenses: ExpensesGroup;
  balance: BalanceGroup;
  // spaceId → owner display name, for attributing entries from linked
  // personal spaces in the shared-space aggregate view. Empty when
  // viewing a personal space (no attribution needed).
  attributions: Record<string, string>;
};
