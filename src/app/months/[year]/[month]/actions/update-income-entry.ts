"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { monthUrl } from "@/helpers/paths";
import { checkIncomeEntryEditable } from "@/helpers/lock";
import { type FormState } from "../form-state";

// Update income entry name and/or amount. Date edits go through a
// separate flow (delete + recreate) because changing the date can
// move the entry to a different month.
export async function updateIncomeEntry(
  entryId: string,
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  void prevState;

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const check = await checkIncomeEntryEditable(supabase, entryId);
    if (!check.ok) return { error: check.error };

    const name = formData.get("name")?.toString().trim();
    const amountRaw = formData.get("amount")?.toString();

    if (!name) return { error: "Name is required" };
    if (!amountRaw) return { error: "Amount is required" };

    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount < 0) {
      return { error: "Amount must be a positive number" };
    }

    const { error } = await supabase
      .from("income_entries")
      .update({ name, amount })
      .eq("id", entryId);

    if (error) return { error: `Failed to update income: ${error.message}` };

    revalidatePath(monthUrl(check.year, check.month));
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
}
