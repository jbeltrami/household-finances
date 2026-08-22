import Card from "@/components/Card";
import { brlFormatter } from "@/helpers/format";
import type { BillsGroup, ExpensesGroup, IncomeGroup } from "../../_types";

type Props = {
  income: IncomeGroup;
  bills: BillsGroup;
  expenses: ExpensesGroup;
};

// Five-column "running total" strip at the bottom of the monthly view.
// All values are already computed upstream in page.tsx — this just
// arranges them in the layout from the mockup.
//
// Colour encodes direction of flow, not good/bad news: money coming in is
// accent, money going out is danger. That's why "Pago até o momento" is red
// even though paying bills off is progress. Urgency is a row-level signal
// (see CalendarStrip's overdue dot); direction is an aggregate-level one.
export default function ResumoCard({ income, bills, expenses }: Props) {
  return (
    <Card className="p-5">
      <h2 className="text-base font-medium text-fg">Resumo</h2>
      <div className="mt-4 grid grid-cols-2 gap-6 lg:grid-cols-5">
        <div>
          <p className="min-h-8 text-xs text-muted">Recebido até o momento</p>
          <p className="mt-1 text-2xl font-bold text-accent">
            {brlFormatter.format(income.received)}
          </p>
        </div>
        <div>
          <p className="min-h-8 text-xs text-muted">Ainda a receber</p>
          <p className="mt-1 text-2xl font-bold text-accent">
            {brlFormatter.format(income.stillExpected)}
          </p>
        </div>
        <div>
          <p className="min-h-8 text-xs text-muted">Pago até o momento</p>
          <p className="mt-1 text-2xl font-bold text-danger">
            {brlFormatter.format(bills.paid)}
          </p>
        </div>
        <div>
          <p className="min-h-8 text-xs text-muted">Falta pagar</p>
          <p className="mt-1 text-2xl font-bold text-danger">
            {brlFormatter.format(bills.remaining)}
          </p>
        </div>
        <div>
          <p className="min-h-8 text-xs text-muted">Despesas</p>
          <p className="mt-1 text-2xl font-bold text-danger">
            {brlFormatter.format(expenses.total)}
          </p>
        </div>
      </div>
    </Card>
  );
}
