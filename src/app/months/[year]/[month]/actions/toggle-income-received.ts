"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { monthUrl } from "@/helpers/paths";
import { checkIncomeEntryEditable } from "@/helpers/lock";

export async function toggleIncomeReceived(
  entryId: string,
  newReceived: boolean,
  formData: FormData
) {
  void formData;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const check = await checkIncomeEntryEditable(supabase, entryId);
  if (!check.ok) throw new Error(check.error);

  const { error } = await supabase
    .from("income_entries")
    .update({ received: newReceived })
    .eq("id", entryId);

  if (error) throw new Error(`Failed to update income: ${error.message}`);

  revalidatePath(monthUrl(check.year, check.month));
}
