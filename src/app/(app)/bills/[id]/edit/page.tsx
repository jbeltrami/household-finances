import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { billsUrl } from "@/helpers/paths";
import { getPersonalSpaceId } from "@/helpers/spaces";
import { getCategories } from "@/helpers/taxonomy";
import EditBillTemplateForm from "./_components/EditBillTemplateForm/EditBillTemplateForm";

export default async function EditBillTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: template } = await supabase
    .from("recurring_bill_templates")
    .select(
      "id, name, default_amount, category_id, icon, due_day, cadence, day_of_week, installments_total, installments_start_month"
    )
    .eq("id", id)
    .single();

  if (!template) notFound();

  const spaceId = await getPersonalSpaceId(supabase);
  if (!spaceId) notFound();

  // Two lists on purpose. The picker offers only active Categorias, but the
  // template may already be filed under one that has since been deactivated,
  // and the form needs its name to render it as the current selection —
  // otherwise saving would silently strip it. See CategorySelect.
  const [categories, allCategories] = await Promise.all([
    getCategories(supabase, spaceId, "outflow"),
    getCategories(supabase, spaceId, "outflow", { includeInactive: true }),
  ]);

  const current =
    allCategories.find((c) => c.id === template.category_id) ?? null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8">
      <Link href={billsUrl()} className="text-sm text-muted hover:text-fg">
        ← Voltar
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-fg">
        Editar conta recorrente
      </h1>

      <div className="mt-6">
        <EditBillTemplateForm
          template={{ ...template, category: current }}
          categories={categories}
        />
      </div>
    </div>
  );
}
