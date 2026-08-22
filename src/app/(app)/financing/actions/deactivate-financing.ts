"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/helpers/session";
import { financingUrl } from "@/helpers/paths";

// Soft-removes a financing (keeps the row + its history). Toggle-style
// action invoked via useTransition, so throwing on failure is fine.
export async function deactivateFinancing(id: string) {
  const supabase = await createClient();

  await requireSession(supabase);

  const { error } = await supabase
    .from("financings")
    .update({ active: false })
    .eq("id", id);

  if (error) {
    throw new Error(`Falha ao remover o financiamento: ${error.message}`);
  }

  revalidatePath(financingUrl());
}
