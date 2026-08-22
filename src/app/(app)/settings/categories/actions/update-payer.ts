"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveSession } from "@/helpers/session";
import { settingsCategoriesUrl } from "@/helpers/paths";
import { type FormState } from "../form-state";
import { UNIQUE_VIOLATION, parsePayerFields } from "./_helpers";

// As with Categorias, a rename reaches every Receita already pointing at
// this Pagador — rows reference it rather than copying its name.
export async function updatePayer(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  void prevState;

  try {
    const supabase = await createClient();

    const session = await resolveSession(supabase);
    if (!session.ok) return { error: session.error };

    const id = formData.get("id")?.toString();
    if (!id) return { error: "Pagador não encontrado" };

    const { name, color } = parsePayerFields(formData);

    const { error } = await supabase
      .from("payers")
      .update({ name, color })
      .eq("id", id);

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        return { error: `Já existe um pagador ativo chamado "${name}"` };
      }
      return { error: `Falha ao salvar o pagador: ${error.message}` };
    }

    revalidatePath(settingsCategoriesUrl());
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Algo deu errado" };
  }
}
