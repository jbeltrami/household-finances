"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveSession } from "@/helpers/session";
import { settingsCategoriesUrl } from "@/helpers/paths";
import { type FormState } from "../form-state";
import { UNIQUE_VIOLATION } from "./_helpers";

// Deactivating retires a Pagador without touching the Receitas that point
// at it. Reactivating can collide, because the partial unique index only
// covers active rows and the freed name may since have been taken.
export async function setPayerActive(
  id: string,
  active: boolean
): Promise<FormState> {
  try {
    const supabase = await createClient();

    const session = await resolveSession(supabase);
    if (!session.ok) return { error: session.error };

    const { error } = await supabase
      .from("payers")
      .update({ active })
      .eq("id", id);

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        return {
          error:
            "Já existe um pagador ativo com esse nome. Renomeie um dos dois antes de reativar.",
        };
      }
      return { error: `Falha ao salvar o pagador: ${error.message}` };
    }

    revalidatePath(settingsCategoriesUrl());
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Algo deu errado" };
  }
}
