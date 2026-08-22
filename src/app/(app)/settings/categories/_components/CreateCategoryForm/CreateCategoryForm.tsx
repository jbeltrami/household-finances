"use client";

import { useRef, useState, useTransition } from "react";
import IconGridPicker from "@/components/IconGridPicker/IconGridPicker";
import ColorPicker from "@/components/ColorPicker/ColorPicker";
import type { CategoryKind } from "@/helpers/taxonomy";
import { createCategory } from "../../actions";
import { initialFormState } from "../../form-state";

type Props = {
  kind: CategoryKind;
};

// Uses `useTransition` with a manual handler rather than
// `useActionState`, because the form needs to *react* to success by
// clearing itself. Doing that from an effect keyed on action state is
// what the react-hooks/set-state-in-effect rule exists to stop; handling
// the result in the same callback that fired the action avoids the
// question entirely.
export default function CreateCategoryForm({ kind }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await createCategory(initialFormState, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      // The pickers listen for the form's reset event and clear their own
      // state, so this one call empties every field.
      formRef.current?.reset();
    });
  };

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-col gap-3">
      <input type="hidden" name="kind" value={kind} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor={`name-${kind}`} className="field-label">
            Nome
          </label>
          <input
            id={`name-${kind}`}
            name="name"
            type="text"
            required
            minLength={2}
            placeholder={kind === "income" ? "Salário" : "Moradia"}
            className="field-input"
          />
        </div>

        <div className="sm:w-52">
          <span className="field-label">Ícone</span>
          <IconGridPicker name="icon" />
        </div>
      </div>

      <div>
        <span className="field-label">Cor</span>
        <ColorPicker name="color" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? "Criando…" : "Adicionar categoria"}
        </button>
        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
