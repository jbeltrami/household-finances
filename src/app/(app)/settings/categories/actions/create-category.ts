"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePersonalSpaceId } from "@/helpers/spaces";
import { settingsCategoriesUrl } from "@/helpers/paths";
import { type FormState } from "../form-state";
import {
  UNIQUE_VIOLATION,
  kindLabel,
  parseCategoryFields,
  parseKind,
} from "./_helpers";

export async function createCategory(
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
    const kind = parseKind(formData.get("kind")?.toString());
    const { name, icon, color } = parseCategoryFields(formData);

    const { error } = await supabase.from("categories").insert({
      space_id: spaceId,
      kind,
      name,
      icon,
      color,
    });

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        return {
          error: `Já existe uma categoria ativa ${kindLabel(kind)} chamada "${name}"`,
        };
      }
      return { error: `Falha ao criar a categoria: ${error.message}` };
    }

    revalidatePath(settingsCategoriesUrl());
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Algo deu errado" };
  }
}
