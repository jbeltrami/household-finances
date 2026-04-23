"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  spaceFundUrl,
  spaceMonthUrl,
  spaceSavingsUrl,
} from "@/helpers/paths";
import { checkSavingsContributionEditable } from "@/helpers/lock";

export async function deleteSavingsContribution(
  contributionId: string
): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const check = await checkSavingsContributionEditable(
      supabase,
      contributionId
    );
    if (!check.ok) return { error: check.error };

    const { data: ctx } = await supabase
      .from("savings_contributions")
      .select("fund_id")
      .eq("id", contributionId)
      .single();
    if (!ctx) return { error: "Contribution not found" };

    const { error } = await supabase
      .from("savings_contributions")
      .delete()
      .eq("id", contributionId);

    if (error) {
      return { error: `Failed to delete contribution: ${error.message}` };
    }

    revalidatePath(spaceSavingsUrl(check.spaceId));
    revalidatePath(spaceFundUrl(check.spaceId, ctx.fund_id));
    revalidatePath(spaceMonthUrl(check.spaceId, check.year, check.month));

    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
}
