"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fetchContributionContext } from "./_helpers";
import {
  isMonthLocked,
  monthUrl,
} from "@/app/months/[year]/[month]/_helpers";

// Delete a contribution. Like update, rejects deletes from locked
// months. Non-FormState signature because the UI calls this via
// useTransition rather than useActionState.
export async function deleteSavingsContribution(
  contributionId: string
): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const ctx = await fetchContributionContext(supabase, contributionId);
    if (!ctx) return { error: "Contribution not found" };

    if (isMonthLocked(ctx)) {
      return {
        error:
          "That month is locked. Unlock it before deleting this contribution.",
      };
    }

    const { error } = await supabase
      .from("savings_contributions")
      .delete()
      .eq("id", contributionId);

    if (error) {
      return { error: `Failed to delete contribution: ${error.message}` };
    }

    revalidatePath("/savings");
    revalidatePath(`/savings/${ctx.fundId}`);
    revalidatePath(monthUrl(ctx.year, ctx.month));

    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
}
