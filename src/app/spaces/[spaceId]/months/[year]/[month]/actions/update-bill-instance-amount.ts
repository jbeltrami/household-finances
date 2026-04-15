"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { spaceMonthUrl } from "@/helpers/paths";
import { type FormState } from "../form-state";
import { checkBillInstanceEditable } from "../_helpers";

export async function updateBillInstanceAmount(
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

    const check = await checkBillInstanceEditable(supabase, id);
    if (!check.ok) return { error: check.error };

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

    revalidatePath(spaceMonthUrl(check.spaceId, check.year, check.month));
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
}
