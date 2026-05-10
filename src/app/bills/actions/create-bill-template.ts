"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { billsUrl } from "@/helpers/paths";
import { type FormState } from "../form-state";
import {
  UNIQUE_VIOLATION,
  computeBiweeklyAnchor,
  parseTemplateFields,
} from "./_helpers";

export async function createBillTemplate(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  void prevState;

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    const spaceId = formData.get("space_id")?.toString();
    if (!spaceId) return { error: "Contexto de espaço ausente" };

    const {
      name,
      defaultAmount,
      category,
      cadence,
      dueDay,
      dayOfWeek,
      installmentsTotal,
      installmentsStartMonth,
    } = parseTemplateFields(formData);

    const { error: insertError } = await supabase
      .from("recurring_bill_templates")
      .insert({
        space_id: spaceId,
        name,
        default_amount: defaultAmount,
        currency: "BRL",
        category,
        cadence,
        due_day: cadence === "monthly" ? dueDay : null,
        day_of_week: cadence !== "monthly" ? dayOfWeek : null,
        biweekly_anchor:
          cadence === "biweekly" && dayOfWeek != null
            ? computeBiweeklyAnchor(dayOfWeek)
            : null,
        installments_total: installmentsTotal,
        installments_start_month: installmentsStartMonth,
      });

    if (insertError) {
      if (insertError.code === UNIQUE_VIOLATION) {
        return { error: `Já existe uma conta ativa chamada "${name}"` };
      }
      return { error: `Falha ao criar a conta: ${insertError.message}` };
    }

    revalidatePath(billsUrl());
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Algo deu errado" };
  }
}
