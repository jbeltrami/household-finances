"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "../form-state";
import { fetchContributionContext } from "./_helpers";
import {
  isMonthLocked,
  monthUrl,
} from "@/app/months/[year]/[month]/_helpers";

// Update a contribution's amount, type, and notes. The month the
// contribution belongs to stays fixed — to move a contribution to a
// different month, delete it and create a new one. This keeps the
// lock-check surface area small and avoids juggling two month rows.
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

    const ctx = await fetchContributionContext(supabase, contributionId);
    if (!ctx) return { error: "Contribution not found" };

    if (isMonthLocked(ctx)) {
      return {
        error:
          "That month is locked. Unlock it before editing this contribution.",
      };
    }

    const { error } = await supabase
      .from("savings_contributions")
      .update({ amount: signedAmount, notes })
      .eq("id", contributionId);

    if (error) {
      return { error: `Failed to update contribution: ${error.message}` };
    }

    revalidatePath("/savings");
    revalidatePath(`/savings/${ctx.fundId}`);
    revalidatePath(monthUrl(ctx.year, ctx.month));

    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
}
