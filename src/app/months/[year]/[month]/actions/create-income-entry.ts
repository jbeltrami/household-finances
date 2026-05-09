"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { monthUrl } from "@/helpers/paths";
import { checkDateEditable } from "@/helpers/lock";
import { todayYmd } from "@/helpers/date";
import { type FormState } from "../form-state";

// Create an income entry. Routes by `expected_date`, not the viewed
// month — adding an April-viewed entry with a June date lands it in
// June. The lock check runs against the target month, so adding to a
// locked month is rejected even when the viewed page is unlocked.
export async function createIncomeEntry(
  spaceId: string,
  viewedYear: number,
  viewedMonth: number,
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

    const name = formData.get("name")?.toString().trim();
    const amountRaw = formData.get("amount")?.toString();
    const expectedDateRaw = formData.get("expected_date")?.toString().trim();

    if (!name) return { error: "Name is required" };
    if (!amountRaw) return { error: "Amount is required" };

    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount < 0) {
      return { error: "Amount must be a positive number" };
    }

    const expectedDate = expectedDateRaw || todayYmd();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expectedDate)) {
      return { error: "Invalid date format" };
    }

    const check = await checkDateEditable(supabase, spaceId, expectedDate);
    if (!check.ok) return { error: check.error };

    const { error } = await supabase.from("income_entries").insert({
      space_id: spaceId,
      expected_date: expectedDate,
      name,
      amount,
      currency: "BRL",
      received: false,
    });

    if (error) return { error: `Failed to create income: ${error.message}` };

    revalidatePath(monthUrl(viewedYear, viewedMonth));
    if (check.year !== viewedYear || check.month !== viewedMonth) {
      revalidatePath(monthUrl(check.year, check.month));
    }
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
}
