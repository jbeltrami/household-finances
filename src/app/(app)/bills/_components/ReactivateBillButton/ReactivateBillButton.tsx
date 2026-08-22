"use client";

import { useState, useTransition } from "react";
import { Power } from "lucide-react";
import { reactivateBillTemplate } from "../../actions";

type Props = {
  templateId: string;
  name: string;
};

// A client component rather than a bare `<form action>` like the deactivate
// button beside it, because reactivating can fail for a reason worth showing
// inline — a name collision — and a thrown error would surface that
// predictable case as the error boundary.
export default function ReactivateBillButton({ templateId, name }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      const result = await reactivateBillTemplate(templateId);
      setError(result.error);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-label={`Reativar ${name}`}
        data-tooltip="Reativar"
        className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-accent disabled:opacity-50"
      >
        <Power className="h-4 w-4" strokeWidth={2} />
      </button>
      {error && (
        <p className="basis-full text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
