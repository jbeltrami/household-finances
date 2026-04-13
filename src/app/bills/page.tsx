import { createClient } from "@/lib/supabase/server";
import CreateBillTemplateForm from "./_components/CreateBillTemplateForm/CreateBillTemplateForm";
import ActiveTemplatesSection from "./_components/ActiveTemplatesSection/ActiveTemplatesSection";
import type { BillTemplate } from "./_types";

export default async function BillsPage() {
  const supabase = await createClient();

  // Find the user's personal space.
  const { data: personalSpace } = await supabase
    .from("spaces")
    .select("id, name")
    .eq("type", "personal")
    .limit(1)
    .single();

  if (!personalSpace) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-red-600 dark:text-red-400">
          No personal space found. This should have been created automatically
          on signup — contact support.
        </p>
      </div>
    );
  }

  // Query active templates for that space.
  const { data: rawTemplates } = await supabase
    .from("recurring_bill_templates")
    .select("id, name, default_amount, currency, due_day")
    .eq("space_id", personalSpace.id)
    .eq("active", true)
    .order("name");

  const templates: BillTemplate[] = (rawTemplates ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    default_amount: t.default_amount,
    currency: t.currency,
    due_day: t.due_day,
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Recurring bills
      </h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Templates used to generate monthly bill instances.
      </p>

      <CreateBillTemplateForm />

      <ActiveTemplatesSection templates={templates} />
    </div>
  );
}
