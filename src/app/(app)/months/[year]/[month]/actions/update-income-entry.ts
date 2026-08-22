"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveSession } from "@/helpers/session";
import { monthUrl } from "@/helpers/paths";
import { checkIncomeEntryEditable } from "@/helpers/lock";
import { type FormState } from "../form-state";

// Update income entry name and/or amount. Date edits go through a
// separate flow (delete + recreate) because changing the date can
// move the entry to a different month.
export async function updateIncomeEntry(
  entryId: string,
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  void prevState;

  try {
    const supabase = await createClient();

    const session = await resolveSession(supabase);
    if (!session.ok) return { error: session.error };

    const check = await checkIncomeEntryEditable(supabase, entryId);
    if (!check.ok) return { error: check.error };

    const name = formData.get("name")?.toString().trim();
    const amountRaw = formData.get("amount")?.toString();

    // Optional — see createIncomeEntry for why.
    if (!amountRaw) return { error: "O valor é obrigatório" };

    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount < 0) {
      return { error: "O valor precisa ser um número positivo" };
    }

    const categoryRaw = formData.get("category_id")?.toString().trim();
    const payerRaw = formData.get("payer_id")?.toString().trim();

    const { error } = await supabase
      .from("income_entries")
      .update({
        name: name || null,
        amount,
        category_id: categoryRaw ? categoryRaw : null,
        payer_id: payerRaw ? payerRaw : null,
      })
      .eq("id", entryId);

    if (error) return { error: `Falha ao atualizar a receita: ${error.message}` };

    revalidatePath(monthUrl(check.year, check.month));
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Algo deu errado" };
  }
}
