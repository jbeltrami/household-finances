import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPersonalSpaceId } from "@/helpers/spaces";
import { getCategories } from "@/helpers/taxonomy";
import { financingUrl } from "@/helpers/paths";
import { brlFormatter } from "@/helpers/format";
import Collapsible from "@/components/Collapsible/Collapsible";
import {
  getFinancingLedger,
  buildSummary,
  toAmortizationInput,
} from "@/helpers/financing";
import { ratePeriodLabel, systemLabel, formatYmd } from "../_helpers";
import AmortizationSimulator from "../_components/AmortizationSimulator/AmortizationSimulator";
import ExtraPaymentForm from "../_components/ExtraPaymentForm/ExtraPaymentForm";
import ExtraPaymentRow from "../_components/ExtraPaymentRow/ExtraPaymentRow";
import DeactivateFinancingButton from "../_components/DeactivateFinancingButton/DeactivateFinancingButton";
import FinancingCategoryPicker from "../_components/FinancingCategoryPicker/FinancingCategoryPicker";

export default async function FinancingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const spaceId = await getPersonalSpaceId(supabase);
  if (!spaceId) notFound();

  // The hydration is space-scoped and returns only active loans, so an id
  // belonging to another space — or to a deactivated Financiamento — simply
  // isn't in it, which is the 404 this page already wanted.
  const ledger = await getFinancingLedger(supabase, spaceId);
  const hydrated = ledger.find((h) => h.financing.id === id);
  if (!hydrated) notFound();
  const { financing, extras, paidNumbers } = hydrated;

  // Active for the picker, full list to resolve a Categoria that has since
  // been deactivated — CategorySelect renders it so saving is not destructive.
  const [categories, allCategories] = await Promise.all([
    getCategories(supabase, spaceId, "outflow"),
    getCategories(supabase, spaceId, "outflow", { includeInactive: true }),
  ]);
  const currentCategory =
    allCategories.find((c) => c.id === financing.category_id) ?? null;

  const summary = buildSummary(hydrated);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8">
      <Link
        href={financingUrl()}
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
        Financiamentos
      </Link>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-fg">{financing.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {systemLabel(financing.amortization_system)} ·{" "}
            {financing.interest_rate}% {ratePeriodLabel(financing.rate_period)} ·
            início em {formatYmd(financing.start_date)}
          </p>
        </div>
        <DeactivateFinancingButton financingId={financing.id} />
      </div>

      <div className="mt-5 max-w-sm">
        <FinancingCategoryPicker
          financingId={financing.id}
          categories={categories}
          current={currentCategory}
        />
      </div>

      {/* Summary */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Valor financiado"
          value={brlFormatter.format(financing.principal)}
        />
        <Stat
          label="Saldo devedor"
          value={brlFormatter.format(summary.outstandingBalance)}
        />
        <Stat
          label="Parcela atual"
          value={brlFormatter.format(summary.monthlyPayment)}
        />
        <Stat
          label="Parcelas"
          value={`${summary.paidCount} / ${summary.total}`}
        />
      </div>

      {/* Extra payments */}
      <div className="mt-6 flex flex-col gap-4">
        <Collapsible
          title="Amortizações extraordinárias"
          description="Pagamentos extras reduzem o saldo. Aparecem como despesas no mês em que ocorrem."
        >
          <ExtraPaymentForm financingId={financing.id} />
        </Collapsible>

        {extras.length > 0 && (
          <Collapsible
            title="Amortizações registradas"
            badge={String(extras.length)}
          >
            <div>
              {extras.map((p) => (
                <ExtraPaymentRow key={p.id} payment={p} />
              ))}
            </div>
          </Collapsible>
        )}
      </div>

      {/* Schedule + simulator */}
      <div className="mt-6">
        <h2 className="text-base font-medium text-fg">Tabela de amortização</h2>
        <p className="mt-1 mb-3 text-sm text-muted">
          Parcelas pagas aparecem destacadas. Simule pagamentos futuros sem
          salvá-los.
        </p>
        <AmortizationSimulator
          financingId={financing.id}
          input={toAmortizationInput(financing)}
          recordedExtras={extras.map((e) => ({
            date: e.date,
            amount: e.amount,
            effect: e.effect,
          }))}
          paidNumbers={Array.from(paidNumbers)}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-subtle bg-surface-2 px-3 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 font-mono text-sm tabular-nums text-fg">{value}</p>
    </div>
  );
}
