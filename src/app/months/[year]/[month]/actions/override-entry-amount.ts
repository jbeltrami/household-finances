"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { monthUrl } from "@/helpers/paths";
import { requirePersonalSpaceId } from "@/helpers/spaces";
import {
  checkDateEditable,
  checkEntryEditable,
} from "@/helpers/lock";
import { type FormState } from "../form-state";
import type { EntryMutationTarget } from "../_types";

export async function overrideEntryAmount(
  target: EntryMutationTarget,
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

    const amountRaw = formData.get("amount")?.toString();
    if (!amountRaw) return { error: "O valor é obrigatório" };

    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount < 0) {
      return { error: "O valor precisa ser um número positivo" };
    }

    if (target.kind === "materialized") {
      const check = await checkEntryEditable(supabase, target.entryId);
      if (!check.ok) return { error: check.error };

      const { error } = await supabase
        .from("entries")
        .update({ amount })
        .eq("id", target.entryId);

      if (error) return { error: `Falha ao atualizar o valor: ${error.message}` };

      revalidatePath(monthUrl(check.year, check.month));
      return { error: null };
    }

    const spaceId = await requirePersonalSpaceId(supabase);

    const check = await checkDateEditable(supabase, spaceId, target.date);
    if (!check.ok) return { error: check.error };

    const { data: template } = await supabase
      .from("recurring_bill_templates")
      .select("name, currency, category")
      .eq("id", target.templateId)
      .single();

    if (!template) return { error: "Conta recorrente não encontrada" };

    const { error } = await supabase.from("entries").insert({
      space_id: spaceId,
      date: target.date,
      name: template.name,
      amount,
      currency: template.currency,
      category: template.category,
      paid: false,
      skipped: false,
      template_id: target.templateId,
      installments_covered: 1,
    });

    if (error) return { error: `Falha ao salvar a sobrescrita: ${error.message}` };

    revalidatePath(monthUrl(check.year, check.month));
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Algo deu errado" };
  }
}
