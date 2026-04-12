import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { deactivateBillTemplate } from "./actions";
import CreateBillTemplateForm from "./_components/CreateBillTemplateForm/CreateBillTemplateForm";

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

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
  const { data: templates } = await supabase
    .from("recurring_bill_templates")
    .select("id, name, default_amount, currency, due_day")
    .eq("space_id", personalSpace.id)
    .eq("active", true)
    .order("name");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Recurring bills
      </h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Templates used to generate monthly bill instances.
      </p>

      <CreateBillTemplateForm />

      {/* Template list */}
      <div className="mt-8">
        <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">
          Active templates
        </h2>
        {!templates || templates.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            No templates yet. Add one above.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
            {templates.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {t.name}
                  </p>
                  {t.due_day && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Due day {t.due_day}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {brlFormatter.format(Number(t.default_amount))}
                  </p>
                  <Link
                    href={`/bills/${t.id}/edit`}
                    className="text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
                  >
                    Edit
                  </Link>
                  <form action={deactivateBillTemplate.bind(null, t.id)}>
                    <button
                      type="submit"
                      className="text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Deactivate
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
