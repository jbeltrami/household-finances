"use client";

import { useActionState } from "react";
import Card from "@/components/Card";
import { createBillTemplate } from "../../actions";
import { initialFormState } from "../../form-state";
import BillTemplateFields from "../BillTemplateFields/BillTemplateFields";

export default function CreateBillTemplateForm() {
  const [state, formAction, isPending] = useActionState(
    createBillTemplate,
    initialFormState
  );

  return (
    <Card className="p-5">
      <form action={formAction}>
        <h2 className="text-base font-medium text-fg">
          Adicionar conta recorrente
        </h2>
        <div className="mt-4">
          <BillTemplateFields />
        </div>

        {state.error && (
          <p className="mt-3 text-sm text-danger" role="alert">
            {state.error}
          </p>
        )}

        <div className="mt-4 flex justify-end">
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? "Adicionando…" : "Adicionar"}
          </button>
        </div>
      </form>
    </Card>
  );
}
