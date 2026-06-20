"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { monthUrl } from "@/helpers/paths";
import { checkIncomeEntryEditable } from "@/helpers/lock";

export async function deleteIncomeEntry(entryId: string): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const check = await checkIncomeEntryEditable(supabase, entryId);
  if (!check.ok) throw new Error(check.error);

  const { error } = await supabase
    .from("income_entries")
    .delete()
    .eq("id", entryId);

  if (error) throw new Error(`Falha ao excluir a receita: ${error.message}`);

  revalidatePath(monthUrl(check.year, check.month));
}
