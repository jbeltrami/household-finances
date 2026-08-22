import { notFound } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPersonalSpaceId } from "@/helpers/spaces";
import { getCategories } from "@/helpers/taxonomy";
import { financingNewUrl } from "@/helpers/paths";
import { getFinancingLedger, buildSummary } from "@/helpers/financing";
import FinancingCard from "./_components/FinancingCard/FinancingCard";

export default async function FinancingPage() {
  const supabase = await createClient();

  const spaceId = await getPersonalSpaceId(supabase);
  if (!spaceId) notFound();

  const [ledger, allCategories] = await Promise.all([
    getFinancingLedger(supabase, spaceId),
    // Inactive included: a Financiamento filed under a since-deactivated
    // Categoria must still show it rather than read as uncategorised.
    getCategories(supabase, spaceId, "outflow", { includeInactive: true }),
  ]);
  const categoryNameById = new Map(allCategories.map((c) => [c.id, c.name]));

  // The hydration already did the fetching; deriving each card's balance,
  // progress and current payment is pure from here.
  const withSummary = ledger.map((h) => ({
    financing: h.financing,
    summary: buildSummary(h),
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Financiamentos</h1>
          <p className="mt-1 text-sm text-muted">
            Acompanhe seus financiamentos (SAC ou Price). A parcela do mês
            aparece nas contas da visão mensal; amortizações extraordinárias
            entram como despesas.
          </p>
        </div>
        <Link
          href={financingNewUrl()}
          className="btn-primary inline-flex shrink-0 items-center gap-1.5"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Novo
        </Link>
      </div>

      {withSummary.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-subtle p-10 text-center">
          <p className="text-sm text-muted">
            Nenhum financiamento ainda. Crie o primeiro simulando a tabela de
            amortização.
          </p>
          <Link
            href={financingNewUrl()}
            className="btn-primary mt-4 inline-flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Novo financiamento
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {withSummary.map(({ financing, summary }) => (
            <FinancingCard
              key={financing.id}
              financing={financing}
              summary={summary}
              categoryName={
                financing.category_id
                  ? categoryNameById.get(financing.category_id) ?? null
                  : null
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
