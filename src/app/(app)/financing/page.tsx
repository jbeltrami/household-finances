import { notFound } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPersonalSpaceId } from "@/helpers/spaces";
import { financingNewUrl } from "@/helpers/paths";
import {
  getFinancings,
  getExtraPayments,
  getPaidInstallments,
  buildFinancingSchedule,
  summarizeFinancing,
} from "@/helpers/financing";
import FinancingCard from "./_components/FinancingCard/FinancingCard";

export default async function FinancingPage() {
  const supabase = await createClient();

  const spaceId = await getPersonalSpaceId(supabase);
  if (!spaceId) notFound();

  const financings = await getFinancings(supabase, spaceId);

  // Per financing: pull its extra payments + paid installments, build the
  // schedule, and derive the summary (balance, progress, current payment).
  const withSummary = await Promise.all(
    financings.map(async (f) => {
      const [extras, paid] = await Promise.all([
        getExtraPayments(supabase, f.id),
        getPaidInstallments(supabase, f.id),
      ]);
      const schedule = buildFinancingSchedule(f, extras);
      return { financing: f, summary: summarizeFinancing(schedule, paid) };
    })
  );

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
            />
          ))}
        </div>
      )}
    </div>
  );
}
