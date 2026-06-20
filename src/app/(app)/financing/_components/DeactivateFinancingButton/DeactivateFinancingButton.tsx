"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { financingUrl } from "@/helpers/paths";
import { deactivateFinancing } from "../../actions";

type Props = {
  financingId: string;
};

export default function DeactivateFinancingButton({ financingId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    const ok = window.confirm(
      "Remover este financiamento? O histórico é preservado, mas ele deixa de aparecer."
    );
    if (!ok) return;
    startTransition(async () => {
      await deactivateFinancing(financingId);
      router.push(financingUrl());
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="btn-danger-ghost"
    >
      {isPending ? "Removendo…" : "Remover financiamento"}
    </button>
  );
}
