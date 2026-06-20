import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPersonalSpaceId } from "@/helpers/spaces";
import CreateBillTemplateForm from "./_components/CreateBillTemplateForm/CreateBillTemplateForm";
import ActiveTemplatesSection from "./_components/ActiveTemplatesSection/ActiveTemplatesSection";
import type { BillTemplate } from "./_types";

export default async function BillsPage() {
  const supabase = await createClient();

  const spaceId = await getPersonalSpaceId(supabase);
  if (!spaceId) notFound();

  // Fire the templates query and the paid-coverage query in parallel.
  // The latter would otherwise have to wait for templates so it could
  // filter by installment template IDs — instead we query all paid
  // template-linked entries for this space (a small set per user)
  // and bucket them client-side.
  const [templatesRes, paidRowsRes] = await Promise.all([
    supabase
      .from("recurring_bill_templates")
      .select(
        "id, name, default_amount, currency, category, icon, cadence, due_day, day_of_week, installments_total, installments_start_month"
      )
      .eq("space_id", spaceId)
      .eq("active", true)
      .order("name"),
    supabase
      .from("entries")
      .select("template_id, installments_covered")
      .eq("space_id", spaceId)
      .eq("paid", true)
      .not("template_id", "is", null),
  ]);

  const templates: BillTemplate[] = (templatesRes.data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    default_amount: t.default_amount,
    currency: t.currency,
    category: t.category,
    icon: t.icon,
    cadence: (t.cadence as string) ?? "monthly",
    due_day: t.due_day,
    day_of_week: t.day_of_week,
    installments_total: t.installments_total,
    installments_start_month: t.installments_start_month,
  }));

  // Installment progress = sum(installments_covered across paid rows)
  // in the `entries` table. "Paid" is the source of truth for how many
  // installments the user has settled. Only installment templates care
  // about the bucket, but we sum into the map indiscriminately and let
  // the lookup below pick out the ones that matter.
  const paidCoveredByTemplate = new Map<string, number>();
  for (const p of paidRowsRes.data ?? []) {
    const tid = p.template_id as string;
    const cov = (p.installments_covered as number) ?? 1;
    paidCoveredByTemplate.set(
      tid,
      (paidCoveredByTemplate.get(tid) ?? 0) + cov
    );
  }

  const activeTemplates: BillTemplate[] = [];
  const completedTemplates: BillTemplate[] = [];
  for (const t of templates) {
    if (t.installments_total == null) {
      activeTemplates.push(t);
      continue;
    }
    const paid = paidCoveredByTemplate.get(t.id) ?? 0;
    if (paid >= t.installments_total) {
      completedTemplates.push(t);
    } else {
      activeTemplates.push(t);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8">
      <h1 className="text-2xl font-semibold text-fg">Contas recorrentes</h1>
      <p className="mt-1 text-sm text-muted">
        Os modelos se expandem virtualmente em ocorrências mensais. Edições
        em ocorrências específicas só são materializadas quando você paga,
        sobrescreve ou ignora a conta.
      </p>

      <div className="mt-6 flex flex-col gap-5">
        <CreateBillTemplateForm />

        <ActiveTemplatesSection
          templates={activeTemplates}
          paidCoveredByTemplate={paidCoveredByTemplate}
        />

        {completedTemplates.length > 0 && (
          <ActiveTemplatesSection
            templates={completedTemplates}
            paidCoveredByTemplate={paidCoveredByTemplate}
            variant="completed"
          />
        )}
      </div>
    </div>
  );
}
