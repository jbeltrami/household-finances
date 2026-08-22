"use client";

import { useActionState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import { billsUrl } from "@/helpers/paths";
import { updateBillTemplate } from "../../../../actions";
import { initialFormState } from "../../../../form-state";
import BillTemplateFields from "../../../../_components/BillTemplateFields/BillTemplateFields";
import type { CategoryRow } from "@/helpers/taxonomy";

type Template = {
  id: string;
  name: string;
  default_amount: number | string;
  icon: string | null;
  category_id: string | null;
  due_day: number | null;
  cadence: string | null;
  day_of_week: number | null;
  installments_total: number | null;
  installments_start_month: string | null;
};

type Props = {
  template: Template;
  categories: CategoryRow[];
};

export default function EditBillTemplateForm({ template, categories }: Props) {
  const boundAction = updateBillTemplate.bind(null, template.id);
  const [state, formAction, isPending] = useActionState(
    boundAction,
    initialFormState
  );

  return (
    <Card className="p-5">
      <form action={formAction}>
        <BillTemplateFields
          categories={categories}
          defaults={{
            name: template.name,
            defaultAmount: template.default_amount,
            icon: template.icon,
            categoryId: template.category_id,
            cadence: template.cadence ?? undefined,
            dueDay: template.due_day,
            dayOfWeek: template.day_of_week,
            installmentsTotal: template.installments_total,
            installmentsStartMonth: template.installments_start_month,
          }}
        />

        {state.error && (
          <p className="mt-3 text-sm text-danger" role="alert">
            {state.error}
          </p>
        )}

        <p className="mt-3 text-xs text-muted">
          Alterações no valor padrão se aplicam automaticamente a todas as
          ocorrências ainda não pagas, já que elas são calculadas a partir do
          modelo em tempo real. Lançamentos já pagos ou com valor sobrescrito
          mantêm os valores salvos.
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <Link href={billsUrl()} className="btn-ghost">
            Cancelar
          </Link>
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>
      </form>
    </Card>
  );
}
