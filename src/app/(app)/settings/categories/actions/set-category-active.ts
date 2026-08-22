"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveSession } from "@/helpers/session";
import { settingsCategoriesUrl } from "@/helpers/paths";
import { type FormState } from "../form-state";
import { UNIQUE_VIOLATION } from "./_helpers";

// Deactivating is the normal way to retire a Categoria: it leaves every
// row still pointing at it, so historical months keep adding up, while
// the pickers stop offering it.
//
// Returns FormState rather than throwing because reactivating can fail
// for a reason the user needs to read: the partial unique index only
// covers active rows, so a name freed by deactivation may since have
// been taken by a new Categoria.
export async function setCategoryActive(
  id: string,
  active: boolean
): Promise<FormState> {
  try {
    const supabase = await createClient();

    const session = await resolveSession(supabase);
    if (!session.ok) return { error: session.error };

    const { error } = await supabase
      .from("categories")
      .update({ active })
      .eq("id", id);

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        return {
          error:
            "Já existe uma categoria ativa com esse nome. Renomeie uma das duas antes de reativar.",
        };
      }
      return { error: `Falha ao salvar a categoria: ${error.message}` };
    }

    revalidatePath(settingsCategoriesUrl());
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Algo deu errado" };
  }
}
