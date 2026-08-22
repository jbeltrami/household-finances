"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { settingsCategoriesUrl } from "@/helpers/paths";
import { type FormState } from "../form-state";
import {
  UNIQUE_VIOLATION,
  kindLabel,
  parseCategoryFields,
  parseKind,
} from "./_helpers";

// Renaming, recolouring and re-iconing are one action: they are the same
// edit form, and splitting them would mean three round trips to change a
// Categoria's presentation.
//
// A rename applies to everything already filed under this Categoria,
// because rows reference it rather than snapshotting its name. That is
// the intended behaviour, not a side effect — see ADR 0001.
export async function updateCategory(
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

    const id = formData.get("id")?.toString();
    if (!id) return { error: "Categoria não encontrada" };

    const kind = parseKind(formData.get("kind")?.toString());
    const { name, icon, color } = parseCategoryFields(formData);

    // RLS scopes this to the caller's own space; no explicit space check
    // is needed and adding one would only duplicate the policy.
    const { error } = await supabase
      .from("categories")
      .update({ name, icon, color })
      .eq("id", id);

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        return {
          error: `Já existe uma categoria ativa ${kindLabel(kind)} chamada "${name}"`,
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
