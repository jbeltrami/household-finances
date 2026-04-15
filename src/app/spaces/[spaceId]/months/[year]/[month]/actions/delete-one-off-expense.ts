"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { spaceMonthUrl } from "@/helpers/paths";
import { checkOneOffExpenseEditable } from "../_helpers";

// Plain async signature — invoked via useTransition from a click handler,
// not via a form action, so no FormData parameter is needed. Throws on
// failure; the UI hides this affordance on locked months so realistic
// failures are rare. year/month kept for API stability; revalidatePath
// uses the checker's values (source of truth).
export async function deleteOneOffExpense(
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

  const check = await checkOneOffExpenseEditable(supabase, id);
  if (!check.ok) throw new Error(check.error);

  const { error } = await supabase
    .from("one_off_expenses")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to delete expense: ${error.message}`);
  }

  revalidatePath(spaceMonthUrl(check.spaceId, check.year, check.month));
}
