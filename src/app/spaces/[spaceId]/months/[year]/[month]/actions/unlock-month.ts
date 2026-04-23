"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { spaceMonthUrl } from "@/helpers/paths";
import { isMonthLocked } from "@/helpers/lock";
import { type FormState } from "../form-state";

const MIN_REASON_LENGTH = 5;

// Insert (or update) the month_unlocks row for the given (space, year,
// month). Once the row exists, isMonthLocked treats the month as
// editable. Rejects attempts to unlock current or future months — they
// aren't locked to begin with, so a row there is just noise.
export async function unlockMonth(
  spaceId: string,
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

    if (!isMonthLocked({ year, month, hasUnlock: false })) {
      return { error: "This month is not locked" };
    }

    const { error } = await supabase.from("month_unlocks").upsert(
      {
        space_id: spaceId,
        year,
        month,
        reason,
        unlocked_by: user.id,
      },
      { onConflict: "space_id,year,month" }
    );

    if (error) return { error: `Failed to unlock month: ${error.message}` };

    revalidatePath(spaceMonthUrl(spaceId, year, month));
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
}
