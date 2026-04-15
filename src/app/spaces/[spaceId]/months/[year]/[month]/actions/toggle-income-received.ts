"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { spaceMonthUrl } from "@/helpers/paths";
import { checkIncomeEntryEditable } from "../_helpers";

// Bound args: id, newReceived, year, month. The trailing FormData arg is
// unused (the form has no fields) but is required because forms always
// pass it. year/month are kept in the signature for API stability but
// revalidatePath uses the values from the checker (source of truth).
export async function toggleIncomeReceived(
  id: string,
  newReceived: boolean,
  year: number,
  month: number,
  formData: FormData
) {
  void formData;
  void year;
  void month;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Defense-in-depth: reject edits to locked months even if the UI
  // somehow allowed the click.
  const check = await checkIncomeEntryEditable(supabase, id);
  if (!check.ok) throw new Error(check.error);

  const { error } = await supabase
    .from("income_entries")
    .update({ received: newReceived })
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to update income entry: ${error.message}`);
  }

  revalidatePath(spaceMonthUrl(check.spaceId, check.year, check.month));
}
