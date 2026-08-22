"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePersonalSpaceId } from "@/helpers/spaces";
import { settingsCategoriesUrl } from "@/helpers/paths";
import { type FormState } from "../form-state";
import { UNIQUE_VIOLATION, parsePayerFields } from "./_helpers";

export async function createPayer(
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

    const spaceId = await requirePersonalSpaceId(supabase);
    const { name, color } = parsePayerFields(formData);

    const { error } = await supabase.from("payers").insert({
      space_id: spaceId,
      name,
      color,
    });

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        return { error: `Já existe um pagador ativo chamado "${name}"` };
      }
      return { error: `Falha ao criar o pagador: ${error.message}` };
    }

    revalidatePath(settingsCategoriesUrl());
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Algo deu errado" };
  }
}
