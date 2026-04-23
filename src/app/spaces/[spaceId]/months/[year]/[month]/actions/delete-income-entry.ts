"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { spaceMonthUrl } from "@/helpers/paths";
import { checkIncomeEntryEditable } from "@/helpers/lock";

export async function deleteIncomeEntry(entryId: string): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const check = await checkIncomeEntryEditable(supabase, entryId);
  if (!check.ok) throw new Error(check.error);

  const { error } = await supabase
    .from("income_entries")
    .delete()
    .eq("id", entryId);

  if (error) throw new Error(`Failed to delete income: ${error.message}`);

  revalidatePath(spaceMonthUrl(check.spaceId, check.year, check.month));
}
