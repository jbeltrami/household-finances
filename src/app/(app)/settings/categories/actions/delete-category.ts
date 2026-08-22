"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { settingsCategoriesUrl } from "@/helpers/paths";
import { countCategoryReferences } from "@/helpers/taxonomy";
import { type FormState } from "../form-state";

// Permanent delete, allowed only when nothing references the Categoria.
//
// The FK is ON DELETE SET NULL, so deleting a referenced Categoria would
// succeed and quietly drop months of history into "Sem categoria" — a lot
// of destruction behind one button. Refusing with a count pushes the user
// toward deactivation, which is what they almost always mean.
//
// The count is a check, not a lock: nothing stops a concurrent write from
// referencing the Categoria between the count and the delete. For a
// single-user space that race is theoretical, and the cost of losing it is
// a few rows becoming uncategorised, not data loss.
export async function deleteCategory(id: string): Promise<FormState> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    const references = await countCategoryReferences(supabase, id);
    if (references > 0) {
      const noun = references === 1 ? "lançamento usa" : "lançamentos usam";
      return {
        error: `${references} ${noun} esta categoria. Desative-a em vez de excluir.`,
      };
    }

    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      return { error: `Falha ao excluir a categoria: ${error.message}` };
    }

    revalidatePath(settingsCategoriesUrl());
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Algo deu errado" };
  }
}
