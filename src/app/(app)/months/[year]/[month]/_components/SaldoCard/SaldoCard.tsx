import Card from "@/components/Card";
import { brlFormatter } from "@/helpers/format";
import type { BalanceGroup } from "../../_types";

type Props = {
  balance: BalanceGroup;
};

// Picks the headline color for a balance figure: green for positive,
// red for negative, neutral fg for exactly zero.
function colorClass(value: number): string {
  if (value > 0) return "text-accent";
  if (value < 0) return "text-danger";
  return "text-fg";
}

export default function SaldoCard({ balance }: Props) {
  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold text-fg">Saldo</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div>
          <p className="text-xs text-muted xl:min-h-8">Saldo esperado</p>
          <p
            className={`mt-1 text-2xl font-semibold ${colorClass(balance.netExpected)}`}
          >
            {brlFormatter.format(balance.netExpected)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted xl:min-h-8">Saldo até o momento</p>
          <p
            className={`mt-1 text-2xl font-semibold ${colorClass(balance.netSoFar)}`}
          >
            {brlFormatter.format(balance.netSoFar)}
          </p>
        </div>
      </div>
    </Card>
  );
}
