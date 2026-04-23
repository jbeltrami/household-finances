"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { spaceMonthUrl } from "@/helpers/paths";
import { checkEntryEditable } from "@/helpers/lock";
import { type FormState } from "../form-state";

// Update an existing entry row. Covers renames, category changes, and
// notes edits. Amount overrides for template-exception rows also come
// through here (overrideEntryAmount is a thin shim for the virtual
// case). Date is intentionally not editable — changing it could move
// the entry to a different month, which is clearer as delete + create.
export async function updateEntry(
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

    const check = await checkEntryEditable(supabase, entryId);
    if (!check.ok) return { error: check.error };

    const name = formData.get("name")?.toString().trim();
    const amountRaw = formData.get("amount")?.toString();
    const categoryRaw = formData.get("category")?.toString().trim();
    const notesRaw = formData.get("notes")?.toString().trim();

    if (!name) return { error: "Name is required" };
    if (!amountRaw) return { error: "Amount is required" };

    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount < 0) {
      return { error: "Amount must be a positive number" };
    }

    const { error } = await supabase
      .from("entries")
      .update({
        name,
        amount,
        category: categoryRaw || null,
        notes: notesRaw || null,
      })
      .eq("id", entryId);

    if (error) return { error: `Failed to update entry: ${error.message}` };

    revalidatePath(spaceMonthUrl(check.spaceId, check.year, check.month));
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
}
