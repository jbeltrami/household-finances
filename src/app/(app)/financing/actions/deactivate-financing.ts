"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { financingUrl } from "@/helpers/paths";

// Soft-removes a financing (keeps the row + its history). Toggle-style
// action invoked via useTransition, so throwing on failure is fine.
export async function deactivateFinancing(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { error } = await supabase
    .from("financings")
    .update({ active: false })
    .eq("id", id);

  if (error) {
    throw new Error(`Falha ao remover o financiamento: ${error.message}`);
  }

  revalidatePath(financingUrl());
}
