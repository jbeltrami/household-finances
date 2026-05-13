import Card from "@/components/Card";
import { brlFormatter } from "@/helpers/format";
import type { BillsGroup, IncomeGroup } from "../../_types";

type Props = {
  income: IncomeGroup;
  bills: BillsGroup;
};

// Four-column "running total" strip at the bottom of the monthly view.
// All values are already computed upstream in page.tsx — this just
// arranges them in the layout from the mockup.
export default function ResumoCard({ income, bills }: Props) {
  return (
    <Card className="p-5">
      <h2 className="text-base font-medium text-fg">Resumo</h2>
      <div className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-4">
        <div>
          <p className="text-xs text-muted">Recebido até o momento</p>
          <p className="mt-1 text-2xl font-bold text-accent">
            {brlFormatter.format(income.received)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">Ainda a receber</p>
          <p className="mt-1 text-2xl font-bold text-accent">
            {brlFormatter.format(income.stillExpected)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">Pago até o momento</p>
          <p className="mt-1 text-2xl font-bold text-accent">
            {brlFormatter.format(bills.paid)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">Falta pagar</p>
          <p className="mt-1 text-2xl font-bold text-accent">
            {brlFormatter.format(bills.remaining)}
          </p>
        </div>
      </div>
    </Card>
  );
}
