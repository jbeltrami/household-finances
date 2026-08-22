import type { YearMonth } from "./_helpers";
import type {
  MortgageBillItem,
  MortgageExpenseItem,
} from "@/helpers/financing";
import type { ResolvedCategory } from "@/helpers/types";
import type { CategoryRow } from "@/helpers/taxonomy";

export type { ResolvedCategory };

export type { MortgageBillItem, MortgageExpenseItem };

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
  // Already resolved through template inheritance by getEntriesForMonth —
  // components never learn whether it came from the row or the template.
  category: ResolvedCategory | null;
  notes: string | null;
  paid: boolean;
  installments_covered: number;
  installmentProgress: {
    paid: number;
    total: number;
    remaining: number;
    defaultAmount: number;
  } | null;
  icon: string | null;
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
// (recurring occurrences — virtual or materialized exceptions) plus any
// financing installments falling in the month. Totals already include the
// mortgage amounts (folded in the page server component).
export type BillsGroup = {
  entries: EntryRow[];
  mortgages: MortgageBillItem[];
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
// (free-form one-offs) plus any financing extra payments made in the month
// (read-only here — managed from the financing area). Total includes both.
export type ExpensesGroup = {
  entries: EntryRow[];
  mortgages: MortgageExpenseItem[];
  total: number;
};

export type BalanceGroup = {
  netExpected: number;
  netSoFar: number;
};

// Discriminated target for actions that mutate a bill occurrence:
// either a materialized row (one already exists in `entries`) or a
// virtual occurrence (template + date that hasn't been written yet —
// the action materializes it on first touch).
export type EntryMutationTarget =
  | { kind: "materialized"; entryId: string }
  | { kind: "virtual"; templateId: string; date: string };

export type MonthlyViewProps = {
  // Active outflow Categorias, for the Despesa forms. Resolved server-side
  // once and fanned out, rather than fetched per form.
  outflowCategories: CategoryRow[];
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
};
