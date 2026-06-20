import Card from "@/components/Card";
import { brlFormatter } from "@/helpers/format";
import type { Insight } from "@/helpers/types";
import type { InsightMeta } from "../../_types";

type Props = {
  insight: Insight;
  meta: InsightMeta;
};

// Status badge copy differs by card: the savings card is a floor
// (meet = at or above), the fixed-expenses card is a cap (meet = at or
// below). Returns null for reference/target cards (meets === null).
function statusBadge(insight: Insight) {
  if (insight.meets == null) return null;
  const ok = insight.meets;
  const label =
    insight.key === "recommendedSavings"
      ? ok
        ? "Dentro da meta"
        : "Abaixo da meta"
      : ok
        ? "Dentro do teto"
        : "Acima do teto";
  return { ok, label };
}

export default function InsightCard({ insight, meta }: Props) {
  const badge = statusBadge(insight);

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div>
        <h3 className="text-sm font-medium text-fg">{meta.title}</h3>
        <p className="mt-1 text-xs text-muted">{meta.meaning}</p>
      </div>

      <div className="text-2xl font-semibold text-fg">
        {brlFormatter.format(insight.target)}
      </div>

      {meta.compareLabel != null && insight.actual != null && (
        <div className="flex items-center justify-between border-t border-subtle pt-3">
          <div className="text-xs text-muted">
            {meta.compareLabel}
            <div className="mt-0.5 text-sm font-medium text-fg">
              {brlFormatter.format(insight.actual)}
            </div>
          </div>
          {badge && (
            <span
              className={
                "rounded-full px-2.5 py-1 text-xs font-medium " +
                (badge.ok
                  ? "bg-accent-soft text-accent"
                  : "bg-danger/10 text-danger")
              }
            >
              {badge.label}
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
