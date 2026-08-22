"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/helpers/session";
import { billsUrl } from "@/helpers/paths";

export async function deactivateBillTemplate(id: string) {
  const supabase = await createClient();

  await requireSession(supabase);

  const { error } = await supabase
    .from("recurring_bill_templates")
    .update({ active: false })
    .eq("id", id);

  if (error) {
    throw new Error(`Falha ao desativar a conta: ${error.message}`);
  }

  revalidatePath(billsUrl());
}
