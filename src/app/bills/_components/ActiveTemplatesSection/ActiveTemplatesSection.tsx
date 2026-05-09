import Link from "next/link";
import { brlFormatter } from "@/helpers/format";
import { billEditUrl } from "@/helpers/paths";
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

// Format "YYYY-MM-01" as "Apr 2026" etc. Pure string math to dodge the
// UTC-parsing trap on YYYY-MM-DD values.
function formatStartMonth(ymd: string): string {
  const [yStr, mStr] = ymd.slice(0, 7).split("-");
  const year = Number(yStr);
  const month = Number(mStr);
  if (!Number.isInteger(year) || !Number.isInteger(month)) return ymd;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

type Props = {
  spaceId: string;
  templates: BillTemplate[];
  paidCoveredByTemplate: Map<string, number>;
  variant?: "active" | "completed";
};

export default function ActiveTemplatesSection({
  spaceId,
  templates,
  paidCoveredByTemplate,
  variant = "active",
}: Props) {
  const heading =
    variant === "completed" ? "Completed installments" : "Active templates";

  return (
    <section className="mt-8">
      <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">
        {heading}
      </h2>
      {templates.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {variant === "completed"
            ? "No completed installment series yet."
            : "No templates yet. Add one above."}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
          {templates.map((t) => {
            const cadText = cadenceLabel(t);
            const isInstallment = t.installments_total != null;
            const paidCovered = paidCoveredByTemplate.get(t.id) ?? 0;
            const installmentText = isInstallment
              ? `Installments — ${paidCovered}/${t.installments_total}` +
                (t.installments_start_month
                  ? ` — starts ${formatStartMonth(t.installments_start_month)}`
                  : "")
              : null;

            return (
              <li
                key={t.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {t.name}
                  </p>
                  {cadText && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {cadText}
                    </p>
                  )}
                  {installmentText && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {installmentText}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {brlFormatter.format(Number(t.default_amount))}
                  </p>
                  <Link
                    href={billEditUrl(t.id)}
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
            );
          })}
        </ul>
      )}
    </section>
  );
}
