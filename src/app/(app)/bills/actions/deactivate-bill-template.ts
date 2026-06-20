"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { billsUrl } from "@/helpers/paths";

export async function deactivateBillTemplate(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { error } = await supabase
    .from("recurring_bill_templates")
    .update({ active: false })
    .eq("id", id);

  if (error) {
    throw new Error(`Falha ao desativar a conta: ${error.message}`);
  }

  revalidatePath(billsUrl());
}
