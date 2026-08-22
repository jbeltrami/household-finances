"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { monthUrl } from "@/helpers/paths";
import { writeOccurrence } from "@/helpers/occurrences";
import type { EntryMutationTarget } from "@/helpers/types";
import { type FormState } from "../form-state";

// Change a Conta's amount for a single month. The exception is written
// against that occurrence alone — the Conta itself and every other month
// keep the template's default, because they are still computed from it.
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

    const result = await writeOccurrence(supabase, target, { amount });
    if (!result.ok) return { error: result.error };

    revalidatePath(monthUrl(result.year, result.month));
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Algo deu errado" };
  }
}
