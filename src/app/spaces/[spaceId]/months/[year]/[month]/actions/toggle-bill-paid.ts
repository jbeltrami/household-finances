"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { spaceMonthUrl } from "@/helpers/paths";
import { checkBillInstanceEditable } from "../_helpers";

// Bound args: id, newPaid, year, month. The trailing FormData arg is unused
// (the form has no fields) but is required because forms always pass it.
// year/month come from the calling row's viewed context and are kept for
// API stability, but revalidatePath uses the spaceId + month derived from
// the checker — the DB is the source of truth.
export async function toggleBillPaid(
  id: string,
  newPaid: boolean,
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
  const check = await checkBillInstanceEditable(supabase, id);
  if (!check.ok) throw new Error(check.error);

  const { error } = await supabase
    .from("bill_instances")
    .update({ paid: newPaid })
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to update bill: ${error.message}`);
  }

  revalidatePath(spaceMonthUrl(check.spaceId, check.year, check.month));
}
