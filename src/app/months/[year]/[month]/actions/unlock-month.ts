"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type FormState } from "../form-state";
import { isMonthLocked, monthUrl } from "../_helpers";

const MIN_REASON_LENGTH = 5;

export async function unlockMonth(
  monthId: string,
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

    const reason = formData.get("reason")?.toString().trim();
    if (!reason) return { error: "A reason is required to unlock the month" };
    if (reason.length < MIN_REASON_LENGTH) {
      return {
        error: `Reason must be at least ${MIN_REASON_LENGTH} characters`,
      };
    }

    // Safety check: the month must actually be locked. Unlocking a current
    // or future month is a no-op but we reject it to avoid storing stray
    // reasons on months that never needed unlocking.
    const { data: monthRow } = await supabase
      .from("months")
      .select("year, month, unlock_reason")
      .eq("id", monthId)
      .single();

    if (!monthRow) return { error: "Month not found" };

    if (
      !isMonthLocked({
        year: monthRow.year,
        month: monthRow.month,
        unlock_reason: monthRow.unlock_reason,
      })
    ) {
      return { error: "This month is not locked" };
    }

    const { error } = await supabase
      .from("months")
      .update({ unlock_reason: reason })
      .eq("id", monthId);

    if (error) {
      return { error: `Failed to unlock month: ${error.message}` };
    }

    revalidatePath(monthUrl(year, month));
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
}
