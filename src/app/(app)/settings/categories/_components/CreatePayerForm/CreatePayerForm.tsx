"use client";

import { useRef, useState, useTransition } from "react";
import ColorPicker from "@/components/ColorPicker/ColorPicker";
import { createPayer } from "../../actions";
import { initialFormState } from "../../form-state";

// Same shape as CreateCategoryForm: useTransition with a manual handler so
// the success path can reset the form in the callback that fired the
// action, rather than from an effect watching action state.
export default function CreatePayerForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await createPayer(initialFormState, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      formRef.current?.reset();
    });
  };

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label htmlFor="payer-name" className="field-label">
          Nome
        </label>
        <input
          id="payer-name"
          name="name"
          type="text"
          required
          minLength={2}
          placeholder="Empresa, cliente ou órgão"
          className="field-input"
        />
      </div>

      <div>
        <span className="field-label">Cor</span>
        <ColorPicker name="color" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? "Criando…" : "Adicionar pagador"}
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
