"use client";

import Link from "next/link";
import { Landmark } from "lucide-react";
import { useTransition } from "react";
import { brlFormatter } from "@/helpers/format";
import { financingDetailUrl } from "@/helpers/paths";
import { toggleInstallmentPaid } from "@/app/(app)/financing/actions";
import type { MortgageBillItem } from "../../_types";

type Props = {
  item: MortgageBillItem;
  locked: boolean;
  highlightedDay: number | null;
};

function formatShortDate(ymd: string): string {
  const [, m, d] = ymd.split("-");
  return `${d}/${m}`;
}

// A financing installment, rendered alongside regular bills. Paid-state
// lives in financing_installment_payments (toggled here); the row links to
// the financing's detail page for the full schedule.
export default function MortgageBillRow({
  item,
  locked,
  highlightedDay,
}: Props) {
  const dueDay = parseInt(item.date.split("-")[2], 10);
  const isHighlighted = highlightedDay !== null && dueDay === highlightedDay;

  const [isToggling, startToggle] = useTransition();
  const handleToggle = () => {
    startToggle(async () => {
      await toggleInstallmentPaid(
        item.financingId,
        item.installmentNumber,
        item.date,
        !item.paid
      );
    });
  };

  return (
    <li
      className={
        "flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 " +
        (isHighlighted ? "bg-accent-soft" : "")
      }
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-fg"
        aria-hidden="true"
      >
        <Landmark className="h-4 w-4" strokeWidth={1.75} />
      </span>

      <div className="min-w-32 flex-1">
        <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-fg">
          <Link
            href={financingDetailUrl(item.financingId)}
            className="min-w-0 truncate hover:underline"
          >
            {item.financingName}
          </Link>
          <span
            className="shrink-0 rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-muted"
            title="Parcela atual / total"
          >
            {item.installmentNumber}/{item.installmentsTotal}
          </span>
        </p>
        <p className="text-xs text-muted">Financiamento</p>
      </div>

      <p className="hidden text-xs text-muted sm:block">
        Vence em {formatShortDate(item.date)}
      </p>

      <p className="shrink-0 text-sm font-medium text-fg">
        {brlFormatter.format(item.amount)}
      </p>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {locked ? (
          <span className={item.paid ? "pill-paid" : "pill-pending"}>
            {item.paid ? "Pago" : "Pendente"}
          </span>
        ) : (
          <button
            type="button"
            onClick={handleToggle}
            disabled={isToggling}
            className={
              (item.paid ? "pill-paid" : "pill-pending") +
              " transition-opacity hover:opacity-80 disabled:animate-pulse"
            }
            title={item.paid ? "Marcar como pendente" : "Marcar como pago"}
          >
            {isToggling ? "…" : item.paid ? "Pago" : "Pendente"}
          </button>
        )}
      </div>
    </li>
  );
}
