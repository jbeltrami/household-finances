"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type FormState } from "../form-state";
import { checkBillInstanceEditable, monthUrl } from "../_helpers";

export async function updateBillInstanceAmount(
  id: string,
  year: number,
  month: number,
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

    const lockError = await checkBillInstanceEditable(supabase, id);
    if (lockError) return { error: lockError };

    const amountRaw = formData.get("amount")?.toString();
    if (!amountRaw) return { error: "Amount is required" };

    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount < 0) {
      return { error: "Amount must be a positive number" };
    }

    const { error } = await supabase
      .from("bill_instances")
      .update({ amount })
      .eq("id", id);

    if (error) {
      return { error: `Failed to update bill: ${error.message}` };
    }

    revalidatePath(monthUrl(year, month));
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
}
