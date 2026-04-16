import { createClient } from "@/lib/supabase/server";
import CreateBillTemplateForm from "./_components/CreateBillTemplateForm/CreateBillTemplateForm";
import ActiveTemplatesSection from "./_components/ActiveTemplatesSection/ActiveTemplatesSection";
import type { BillTemplate } from "./_types";

export default async function BillsPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  const supabase = await createClient();

  // Query active templates for the space in the URL. RLS ensures
  // the user can only see spaces they belong to, so a stale or
  // forged spaceId simply returns an empty list.
  const { data: rawTemplates } = await supabase
    .from("recurring_bill_templates")
    .select("id, name, default_amount, currency, cadence, due_day, day_of_week")
    .eq("space_id", spaceId)
    .eq("active", true)
    .order("name");

  const templates: BillTemplate[] = (rawTemplates ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    default_amount: t.default_amount,
    currency: t.currency,
    cadence: (t.cadence as string) ?? "monthly",
    due_day: t.due_day,
    day_of_week: t.day_of_week,
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Recurring bills
      </h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Templates used to generate monthly bill instances.
      </p>

      <CreateBillTemplateForm spaceId={spaceId} />

      <ActiveTemplatesSection spaceId={spaceId} templates={templates} />
    </div>
  );
}
