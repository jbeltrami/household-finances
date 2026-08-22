"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { settingsCategoriesUrl } from "@/helpers/paths";
import { countPayerReferences } from "@/helpers/taxonomy";
import { type FormState } from "../form-state";

// Same rule as Categorias: the FK is ON DELETE SET NULL, so deleting a
// referenced Pagador would succeed and silently strip it off every Receita
// it was attached to. Refuse with a count and point at deactivation.
export async function deletePayer(id: string): Promise<FormState> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    const references = await countPayerReferences(supabase, id);
    if (references > 0) {
      const noun = references === 1 ? "receita usa" : "receitas usam";
      return {
        error: `${references} ${noun} este pagador. Desative-o em vez de excluir.`,
      };
    }

    const { error } = await supabase.from("payers").delete().eq("id", id);
    if (error) {
      return { error: `Falha ao excluir o pagador: ${error.message}` };
    }

    revalidatePath(settingsCategoriesUrl());
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Algo deu errado" };
  }
}
