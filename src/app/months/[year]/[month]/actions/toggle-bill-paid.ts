"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkBillInstanceEditable, monthUrl } from "../_helpers";

// Bound args: id, newPaid, year, month. The trailing FormData arg is unused
// (the form has no fields) but is required because forms always pass it.
export async function toggleBillPaid(
  id: string,
  newPaid: boolean,
  year: number,
  month: number,
  formData: FormData
) {
  void formData;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Defense-in-depth: reject edits to locked months even if the UI
  // somehow allowed the click.
  const lockError = await checkBillInstanceEditable(supabase, id);
  if (lockError) throw new Error(lockError);

  const { error } = await supabase
    .from("bill_instances")
    .update({ paid: newPaid })
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to update bill: ${error.message}`);
  }

  revalidatePath(monthUrl(year, month));
}
