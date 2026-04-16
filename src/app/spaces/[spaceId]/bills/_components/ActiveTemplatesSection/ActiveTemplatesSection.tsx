import Link from "next/link";
import { brlFormatter } from "@/helpers/format";
import { spaceBillEditUrl } from "@/helpers/paths";
import { deactivateBillTemplate } from "../../actions";
import type { BillTemplate } from "../../_types";

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function cadenceLabel(t: BillTemplate): string | null {
  switch (t.cadence) {
    case "weekly":
      return `Weekly — ${DAY_LABELS[t.day_of_week ?? 0]}`;
    case "biweekly":
      return `Biweekly — ${DAY_LABELS[t.day_of_week ?? 0]}`;
    default:
      return t.due_day ? `Due day ${t.due_day}` : null;
  }
}

type Props = {
  spaceId: string;
  templates: BillTemplate[];
};

export default function ActiveTemplatesSection({ spaceId, templates }: Props) {
  return (
    <section className="mt-8">
      <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">
        Active templates
      </h2>
      {templates.length === 0 ? (
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
                {cadenceLabel(t) && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {cadenceLabel(t)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {brlFormatter.format(Number(t.default_amount))}
                </p>
                <Link
                  href={spaceBillEditUrl(spaceId, t.id)}
                  className="text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
                >
                  Edit
                </Link>
                <form action={deactivateBillTemplate.bind(null, t.id)}>
                  {/* deactivateBillTemplate reads space_id from FormData
                      to build its revalidatePath URL. */}
                  <input type="hidden" name="space_id" value={spaceId} />
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
    </section>
  );
}
