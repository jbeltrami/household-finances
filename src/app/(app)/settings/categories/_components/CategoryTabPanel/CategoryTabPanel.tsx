import Card from "@/components/Card";
import Collapsible from "@/components/Collapsible/Collapsible";
import type { CategoryKind, CategoryRow as Category } from "@/helpers/taxonomy";
import CategoryRow from "../CategoryRow/CategoryRow";
import CreateCategoryForm from "../CreateCategoryForm/CreateCategoryForm";

type Props = {
  kind: CategoryKind;
  categories: Category[];
};

const COPY: Record<CategoryKind, { blurb: string; empty: string }> = {
  outflow: {
    blurb:
      "Agrupam suas Contas, Despesas e Financiamentos. Só aparecem onde dinheiro sai.",
    empty: "Nenhuma categoria de saída ativa.",
  },
  income: {
    blurb:
      "Agrupam suas Receitas por tipo de dinheiro — salário, freelance, restituição.",
    empty: "Nenhuma categoria de receita ativa.",
  },
};

// Server component: the list is plain rendered markup and only the rows
// and the create form are interactive.
export default function CategoryTabPanel({ kind, categories }: Props) {
  const active = categories.filter((c) => c.active);
  const inactive = categories.filter((c) => !c.active);
  const copy = COPY[kind];

  return (
    <div className="mt-5 flex flex-col gap-5">
      <Card className="p-5">
        <h2 className="text-base font-medium text-fg">Nova categoria</h2>
        <p className="mt-1 text-xs text-muted">{copy.blurb}</p>
        <div className="mt-4">
          <CreateCategoryForm kind={kind} />
        </div>
      </Card>

      <Card className="p-2">
        {active.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted">
            {copy.empty}
          </p>
        ) : (
          <ul className="divide-y divide-subtle">
            {active.map((category) => (
              <CategoryRow key={category.id} category={category} />
            ))}
          </ul>
        )}
      </Card>

      {inactive.length > 0 && (
        <Collapsible
          title="Desativadas"
          badge={String(inactive.length)}
          description="Continuam valendo no histórico e nos relatórios, mas não aparecem ao criar lançamentos."
        >
          <ul className="divide-y divide-subtle">
            {inactive.map((category) => (
              <CategoryRow key={category.id} category={category} />
            ))}
          </ul>
        </Collapsible>
      )}
    </div>
  );
}
