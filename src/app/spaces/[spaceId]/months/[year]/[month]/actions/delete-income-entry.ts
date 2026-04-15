"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { spaceMonthUrl } from "@/helpers/paths";
import { checkIncomeEntryEditable } from "../_helpers";

// Plain async signature — this action is invoked via useTransition from
// a click handler, not via a form action, so no FormData parameter is
// needed. Throws on failure; the UI hides this affordance on locked
// months so realistic failures are rare. year/month kept for API
// stability; revalidatePath uses the checker's values.
export async function deleteIncomeEntry(
  id: string,
  year: number,
  month: number
): Promise<void> {
  void year;
  void month;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Defense-in-depth: refuse to delete from a locked month even if the
  // UI button is somehow reachable.
  const check = await checkIncomeEntryEditable(supabase, id);
  if (!check.ok) throw new Error(check.error);

  const { error } = await supabase
    .from("income_entries")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to delete income entry: ${error.message}`);
  }

  revalidatePath(spaceMonthUrl(check.spaceId, check.year, check.month));
}
