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
      "id, name, default_amount, category, due_day, cadence, day_of_week, installments_total, installments_start_month"
    )
    .eq("id", id)
    .single();

  if (!template) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center gap-3">
        <Link
          href={billsUrl()}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ← Voltar
        </Link>
      </div>
      <h1 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Editar conta recorrente
      </h1>

      <EditBillTemplateForm spaceId={spaceId} template={template} />
    </div>
  );
}
