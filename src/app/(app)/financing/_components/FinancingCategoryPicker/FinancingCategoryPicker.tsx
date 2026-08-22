"use client";

import { useState, useTransition } from "react";
import CategorySelect from "@/components/CategorySelect/CategorySelect";
import type { CategoryRow } from "@/helpers/taxonomy";
import { setFinancingCategory } from "../../actions";

type Props = {
  financingId: string;
  categories: CategoryRow[];
  current: { id: string; name: string } | null;
};

// Saves on change rather than behind a button. There is exactly one field
// here, so a Save button would be pure ceremony — and unlike the loan
// parameters, a mis-set Categoria is trivially reversible.
export default function FinancingCategoryPicker({
  financingId,
  categories,
  current,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value || null;
    startTransition(async () => {
      const result = await setFinancingCategory(financingId, value);
      setError(result.error);
    });
  };

  return (
    <div>
      <label htmlFor="financing_category" className="field-label">
        Categoria {isPending && <span className="text-muted">· salvando…</span>}
      </label>
      <CategorySelect
        id="financing_category"
        categories={categories}
        current={current}
        onChange={handleChange}
        disabled={isPending}
      />
      {error && (
        <p className="mt-1 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
