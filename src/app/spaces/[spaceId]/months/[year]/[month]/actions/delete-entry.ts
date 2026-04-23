"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { spaceMonthUrl } from "@/helpers/paths";
import { checkEntryEditable } from "@/helpers/lock";

// Delete a materialized entry. For one-offs this removes the row
// entirely. For template exceptions (paid, overridden, skipped rows)
// this returns the occurrence to pure-virtual state — next render,
// the template's default amount and date render the entry as if
// nothing had happened.
export async function deleteEntry(entryId: string): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const check = await checkEntryEditable(supabase, entryId);
  if (!check.ok) throw new Error(check.error);

  const { error } = await supabase
    .from("entries")
    .delete()
    .eq("id", entryId);

  if (error) throw new Error(`Failed to delete entry: ${error.message}`);

  revalidatePath(spaceMonthUrl(check.spaceId, check.year, check.month));
}
