import Card from "@/components/Card";
import Collapsible from "@/components/Collapsible/Collapsible";
import type { PayerRow as Payer } from "@/helpers/taxonomy";
import PayerRow from "../PayerRow/PayerRow";
import CreatePayerForm from "../CreatePayerForm/CreatePayerForm";

type Props = {
  payers: Payer[];
};

export default function PayerTabPanel({ payers }: Props) {
  const active = payers.filter((p) => p.active);
  const inactive = payers.filter((p) => !p.active);

  return (
    <div className="mt-5 flex flex-col gap-5">
      <Card className="p-5">
        <h2 className="text-base font-medium text-fg">Novo pagador</h2>
        <p className="mt-1 text-xs text-muted">
          Quem te paga — empregador, cliente, governo. Aparece só nas Receitas;
          nas saídas o nome da própria Conta já diz para quem você pagou.
        </p>
        <div className="mt-4">
          <CreatePayerForm />
        </div>
      </Card>

      <Card className="p-2">
        {active.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted">
            Nenhum pagador ainda. Crie um acima, ou direto no formulário de
            receita.
          </p>
        ) : (
          <ul className="divide-y divide-subtle">
            {active.map((payer) => (
              <PayerRow key={payer.id} payer={payer} />
            ))}
          </ul>
        )}
      </Card>

      {inactive.length > 0 && (
        <Collapsible
          title="Desativados"
          badge={String(inactive.length)}
          description="Continuam valendo no histórico, mas não aparecem ao lançar uma receita."
        >
          <ul className="divide-y divide-subtle">
            {inactive.map((payer) => (
              <PayerRow key={payer.id} payer={payer} />
            ))}
          </ul>
        </Collapsible>
      )}
    </div>
  );
}
