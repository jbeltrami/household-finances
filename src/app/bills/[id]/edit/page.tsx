import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
    .select("id, name, default_amount, due_day")
    .eq("id", id)
    .single();

  if (!template) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center gap-3">
        <Link
          href="/bills"
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ← Back
        </Link>
      </div>
      <h1 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Edit template
      </h1>

      <EditBillTemplateForm template={template} />
    </div>
  );
}
