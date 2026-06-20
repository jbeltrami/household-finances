import Link from "next/link";
import { Landmark } from "lucide-react";
import { brlFormatter } from "@/helpers/format";
import { financingDetailUrl } from "@/helpers/paths";
import type { MortgageExpenseItem } from "../../_types";

type Props = {
  item: MortgageExpenseItem;
};

function formatShortDate(ymd: string): string {
  const [, m, d] = ymd.split("-");
  return `${d}/${m}`;
}

// A financing extra payment, shown read-only among the month's expenses.
// Editing/removing happens on the financing detail page (the link target).
export default function MortgageExpenseRow({ item }: Props) {
  const effectLabel =
    item.effect === "reduce_term" ? "Reduziu prazo" : "Reduziu parcela";

  return (
    <li className="flex items-center gap-x-3 px-3 py-2.5">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-fg"
        aria-hidden="true"
      >
        <Landmark className="h-4 w-4" strokeWidth={1.75} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg">
          <Link
            href={financingDetailUrl(item.financingId)}
            className="hover:underline"
          >
            Amortização — {item.financingName}
          </Link>
        </p>
        <p className="text-xs text-muted">
          {formatShortDate(item.date)} · {effectLabel}
        </p>
      </div>

      <p className="shrink-0 text-sm font-medium text-fg">
        {brlFormatter.format(item.amount)}
      </p>
    </li>
  );
}
