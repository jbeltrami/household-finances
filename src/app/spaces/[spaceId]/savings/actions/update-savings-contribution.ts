"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  spaceFundUrl,
  spaceMonthUrl,
  spaceSavingsUrl,
} from "@/helpers/paths";
import { checkSavingsContributionEditable } from "@/helpers/lock";
import type { FormState } from "../form-state";

// Update a contribution's amount, type, and notes. The date stays
// fixed — to move a contribution to a different month, delete and
// recreate. Keeps lock-check surface area small.
export async function updateSavingsContribution(
  contributionId: string,
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

    const amountRaw = formData.get("amount")?.toString();
    const type = formData.get("type")?.toString();
    const notesRaw = formData.get("notes")?.toString().trim();

    if (!amountRaw) return { error: "Amount is required" };
    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { error: "Amount must be a positive number" };
    }
    if (type !== "deposit" && type !== "withdraw") {
      return { error: "Type must be 'deposit' or 'withdraw'" };
    }
    const signedAmount = type === "deposit" ? amount : -amount;
    const notes = notesRaw ? notesRaw : null;

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
      .update({ amount: signedAmount, notes })
      .eq("id", contributionId);

    if (error) {
      return { error: `Failed to update contribution: ${error.message}` };
    }

    revalidatePath(spaceSavingsUrl(check.spaceId));
    revalidatePath(spaceFundUrl(check.spaceId, ctx.fund_id));
    revalidatePath(spaceMonthUrl(check.spaceId, check.year, check.month));

    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
}
