"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { spaceMonthUrl } from "@/helpers/paths";
import { type FormState } from "../form-state";
import { checkOneOffExpenseEditable } from "../_helpers";

// Updates name, amount, category, and notes. Date is intentionally not
// editable here — changing it could move the expense to a different
// month (same routing logic as create), which is more complex than
// we want inline. Delete + re-create is the current workaround.
export async function updateOneOffExpense(
  id: string,
  year: number,
  month: number,
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  void prevState;
  void year;
  void month;

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const check = await checkOneOffExpenseEditable(supabase, id);
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

    const category = categoryRaw || null;
    const notes = notesRaw || null;

    const { error } = await supabase
      .from("one_off_expenses")
      .update({ name, amount, category, notes })
      .eq("id", id);

    if (error) {
      return { error: `Failed to update expense: ${error.message}` };
    }

    revalidatePath(spaceMonthUrl(check.spaceId, check.year, check.month));
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
}
