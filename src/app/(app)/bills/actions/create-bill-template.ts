"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveSession } from "@/helpers/session";
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

    const session = await resolveSession(supabase);
    if (!session.ok) return { error: session.error };
    const { spaceId } = session;

    const {
      name,
      defaultAmount,
      categoryId,
      icon,
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
        category_id: categoryId,
        icon,
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
