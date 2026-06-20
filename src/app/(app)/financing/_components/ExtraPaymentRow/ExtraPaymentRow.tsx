"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { brlFormatter } from "@/helpers/format";
import type { ExtraPaymentRow as ExtraPayment } from "@/helpers/financing";
import { deleteExtraPayment } from "../../actions";
import { effectLabel, formatYmd } from "../../_helpers";

type Props = {
  payment: ExtraPayment;
};

export default function ExtraPaymentRow({ payment }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      await deleteExtraPayment(payment.id, payment.financing_id);
    });
  };

  return (
    <div className="flex items-center justify-between gap-3 border-t border-subtle py-2.5 text-sm">
      <div className="min-w-0">
        <p className="font-mono tabular-nums text-fg">
          {brlFormatter.format(payment.amount)}
        </p>
        <p className="mt-0.5 text-xs text-muted">
          {formatYmd(payment.date)} · {effectLabel(payment.effect)}
          {payment.notes ? ` · ${payment.notes}` : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        aria-label="Remover amortização"
        className="btn-danger-ghost shrink-0"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
