import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPersonalSpaceId } from "@/helpers/spaces";
import { billsUrl } from "@/helpers/paths";
import EditBillTemplateForm from "./_components/EditBillTemplateForm/EditBillTemplateForm";

export default async function EditBillTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const spaceId = await getPersonalSpaceId(supabase);
  if (!spaceId) notFound();

  const { data: template } = await supabase
    .from("recurring_bill_templates")
    .select(
      "id, name, default_amount, category, icon, due_day, cadence, day_of_week, installments_total, installments_start_month"
    )
    .eq("id", id)
    .single();

  if (!template) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8">
      <Link href={billsUrl()} className="text-sm text-muted hover:text-fg">
        ← Voltar
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-fg">
        Editar conta recorrente
      </h1>

      <div className="mt-6">
        <EditBillTemplateForm spaceId={spaceId} template={template} />
      </div>
    </div>
  );
}
