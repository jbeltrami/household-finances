"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import CategoryChip from "@/components/CategoryChip";
import { brlFormatter } from "@/helpers/format";
import type { CategorySpend } from "@/helpers/category-reports";

type Props = {
  summary: CategorySpend;
};

// "YYYY-MM-DD" formatted without ever constructing a Date. Parsing one would
// read the string as UTC midnight, which in São Paulo renders as the previous
// day — the trap CLAUDE.md calls out for every date-only column.
const MONTHS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

function formatDay(ymd: string): string {
  const [, m, d] = ymd.split("-");
  const month = MONTHS[Number(m) - 1];
  return month ? `${d} ${month}` : ymd;
}

function countLabel(summary: CategorySpend): string {
  const parts: string[] = [];
  if (summary.billsCount > 0) {
    parts.push(
      `${summary.billsCount} ${summary.billsCount === 1 ? "conta paga" : "contas pagas"}`
    );
  }
  if (summary.expensesCount > 0) {
    parts.push(
      `${summary.expensesCount} ${summary.expensesCount === 1 ? "despesa avulsa" : "despesas avulsas"}`
    );
  }
  return parts.join(" + ");
}

export default function CategorySpendRow({ summary }: Props) {
  const [open, setOpen] = useState(false);
  const label = summary.category?.name ?? "Sem categoria";
  const panelId = `spend-${summary.category?.id ?? "uncategorised"}`;

  return (
    <li className="border-b border-subtle last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-surface-2"
      >
        <CategoryChip
          icon={summary.category?.icon ?? null}
          color={summary.category?.color ?? null}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-fg">{label}</p>
          <p className="text-xs text-muted">{countLabel(summary)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-fg">
            {brlFormatter.format(summary.total)}
          </p>
          {summary.billsTotal > 0 && summary.expensesTotal > 0 && (
            <p className="text-xs text-muted">
              {brlFormatter.format(summary.billsTotal)} +{" "}
              {brlFormatter.format(summary.expensesTotal)}
            </p>
          )}
        </div>
        <ChevronDown
          className={
            "h-4 w-4 shrink-0 text-muted transition-transform " +
            (open ? "rotate-180" : "")
          }
          strokeWidth={2}
        />
      </button>

      {open && (
        <div id={panelId} className="px-3 pb-3">
          {/* Capped and scrollable: a year of Moradia is comfortably fifty
              rows, and letting that push the rest of the report off screen
              would make the expansion cost more than it gives. */}
          <ul className="max-h-80 overflow-y-auto rounded-lg bg-surface-2">
            {summary.lines.map((line) => (
              <li
                key={line.id}
                className="flex items-baseline gap-3 border-b border-subtle px-3 py-2 last:border-b-0"
              >
                <span className="w-14 shrink-0 text-xs tabular-nums text-muted">
                  {formatDay(line.date)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-fg">
                  {line.name}
                </span>
                <span
                  className={
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium " +
                    (line.kind === "bill"
                      ? "bg-surface text-muted"
                      : "bg-warn-soft text-warn")
                  }
                >
                  {line.kind === "bill" ? "conta" : "despesa"}
                </span>
                <span className="shrink-0 text-sm tabular-nums text-fg">
                  {brlFormatter.format(line.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}
