"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "../form-state";
import { parseContributionFields } from "./_helpers";
import {
  getOrCreateMonth,
  isMonthLocked,
  monthUrl,
} from "@/app/months/[year]/[month]/_helpers";

// Create a contribution against a specific fund. The target month comes
// from the form (as "YYYY-MM") and is lazy-created through the same
// helper the monthly view uses. Lock enforcement is applied to the
// *target* month, not the savings page — adding a contribution to a
// past locked month is blocked even though the savings page itself
// isn't month-scoped.
export async function createSavingsContribution(
  fundId: string,
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

    const { signedAmount, year, month, notes } =
      parseContributionFields(formData);

    // Look up the fund's space so we can create its month row in the
    // right scope. RLS guarantees we only see funds we have access to.
    const { data: fund } = await supabase
      .from("savings_funds")
      .select("space_id")
      .eq("id", fundId)
      .single();
    if (!fund) return { error: "Fund not found" };

    const targetMonth = await getOrCreateMonth(
      supabase,
      fund.space_id,
      year,
      month
    );

    if (isMonthLocked(targetMonth)) {
      return {
        error:
          "That month is locked. Unlock it before logging a contribution there.",
      };
    }

    const { error } = await supabase.from("savings_contributions").insert({
      fund_id: fundId,
      month_id: targetMonth.id,
      amount: signedAmount,
      notes,
    });

    if (error) {
      return { error: `Failed to create contribution: ${error.message}` };
    }

    revalidatePath("/savings");
    revalidatePath(`/savings/${fundId}`);
    // The monthly view shows a savings summary row, so nudge the target
    // month's page too.
    revalidatePath(monthUrl(year, month));

    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
}
