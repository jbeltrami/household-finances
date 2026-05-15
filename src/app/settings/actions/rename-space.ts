"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePersonalSpaceId } from "@/helpers/spaces";
import { settingsUrl } from "@/helpers/paths";

type FormState = { error: string | null };

export async function renameSpace(
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

    const name = formData.get("name")?.toString().trim();
    if (!name) return { error: "O nome é obrigatório" };
    if (name.length < 2) return { error: "O nome precisa ter pelo menos 2 caracteres" };

    const { error } = await supabase
      .from("spaces")
      .update({ name })
      .eq("id", spaceId);

    if (error) return { error: `Falha ao renomear: ${error.message}` };

    // Bust the layout cache so the Navbar dropdown picks up the new name.
    revalidatePath("/", "layout");
    revalidatePath(settingsUrl());
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Algo deu errado" };
  }
}
