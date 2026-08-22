"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { financingDetailUrl, financingUrl } from "@/helpers/paths";
import { type FormState } from "../form-state";

// Changes only the Categoria of a Financiamento.
//
// Deliberately narrow rather than a general edit form. Every other column
// on `financings` is an input to the amortization schedule, which is
// computed rather than stored — letting a form near `principal`,
// `interest_rate` or `start_date` would silently reshape the whole
// schedule, and the installments already marked paid against it. A
// single-purpose action cannot do that.
export async function setFinancingCategory(
  financingId: string,
  categoryId: string | null
): Promise<FormState> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    const { error } = await supabase
      .from("financings")
      .update({ category_id: categoryId })
      .eq("id", financingId);

    if (error) {
      return { error: `Falha ao salvar a categoria: ${error.message}` };
    }

    revalidatePath(financingUrl());
    revalidatePath(financingDetailUrl(financingId));
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Algo deu errado" };
  }
}
