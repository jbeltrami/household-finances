import Link from "next/link";
import { Pencil, PowerOff } from "lucide-react";
import BillIcon from "@/components/BillIcon";
import Card from "@/components/Card";
import { brlFormatter } from "@/helpers/format";
import { billEditUrl } from "@/helpers/paths";
import { deactivateBillTemplate } from "../../actions";
import type { BillTemplate } from "../../_types";

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function cadenceLabel(t: BillTemplate): string | null {
  switch (t.cadence) {
    case "weekly":
      return `Semanal — ${DAY_LABELS[t.day_of_week ?? 0]}`;
    case "biweekly":
      return `Quinzenal — ${DAY_LABELS[t.day_of_week ?? 0]}`;
    default:
      return t.due_day ? `Vence dia ${t.due_day}` : null;
  }
}

// Format "YYYY-MM-01" as "abr de 2026" etc. Pure string math to dodge the
// UTC-parsing trap on YYYY-MM-DD values.
function formatStartMonth(ymd: string): string {
  const [yStr, mStr] = ymd.slice(0, 7).split("-");
  const year = Number(yStr);
  const month = Number(mStr);
  if (!Number.isInteger(year) || !Number.isInteger(month)) return ymd;
  return new Intl.DateTimeFormat("pt-BR", {
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
    variant === "completed" ? "Parcelamentos concluídos" : "Contas ativas";

  return (
    <Card className="p-5">
      <h2 className="text-base font-medium text-fg">{heading}</h2>
      {templates.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          {variant === "completed"
            ? "Nenhum parcelamento concluído ainda."
            : "Nenhuma conta cadastrada. Adicione uma acima."}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-subtle">
          {templates.map((t) => {
            const cadText = cadenceLabel(t);
            const isInstallment = t.installments_total != null;
            const paidCovered = paidCoveredByTemplate.get(t.id) ?? 0;
            const installmentText = isInstallment
              ? `Parcelas — ${paidCovered}/${t.installments_total}` +
                (t.installments_start_month
                  ? ` — começa em ${formatStartMonth(t.installments_start_month)}`
                  : "")
              : null;

            return (
              <li
                key={t.id}
                className="flex items-center gap-3 px-3 py-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-fg">
                  <BillIcon iconKey={t.icon} className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fg">
                    {t.name}
                  </p>
                  {cadText && (
                    <p className="text-xs text-muted">{cadText}</p>
                  )}
                  {installmentText && (
                    <p className="text-xs text-muted">{installmentText}</p>
                  )}
                </div>
                <p className="text-sm font-medium text-fg">
                  {brlFormatter.format(Number(t.default_amount))}
                </p>
                <div className="flex items-center gap-0.5">
                  <Link
                    href={billEditUrl(t.id)}
                    className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-fg"
                    aria-label="Editar"
                    data-tooltip="Editar"
                  >
                    <Pencil className="h-4 w-4" strokeWidth={2} />
                  </Link>
                  <form action={deactivateBillTemplate.bind(null, t.id)}>
                    {/* deactivateBillTemplate reads space_id from FormData
                        to build its revalidatePath URL. */}
                    <input type="hidden" name="space_id" value={spaceId} />
                    <button
                      type="submit"
                      className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-danger"
                      aria-label="Desativar"
                      data-tooltip="Desativar"
                    >
                      <PowerOff className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
