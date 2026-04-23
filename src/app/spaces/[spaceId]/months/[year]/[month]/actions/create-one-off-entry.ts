"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { spaceMonthUrl } from "@/helpers/paths";
import { checkDateEditable } from "@/helpers/lock";
import { todayYmd } from "@/helpers/date";
import { type FormState } from "../form-state";

// Create a one-off entry (money-out event with no template). The
// viewed year/month informs the default date, but the entry routes
// by its `date` field, so a user adding an entry with a date in a
// different month naturally lands it there.
export async function createOneOffEntry(
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
    const dateRaw = formData.get("date")?.toString().trim();
    const categoryRaw = formData.get("category")?.toString().trim();
    const notesRaw = formData.get("notes")?.toString().trim();

    if (!name) return { error: "Name is required" };
    if (!amountRaw) return { error: "Amount is required" };

    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount < 0) {
      return { error: "Amount must be a positive number" };
    }

    // Every entry must have a date. If the user leaves it blank, default
    // to today — one-off entries represent real spending and "sometime
    // this month" isn't useful for cash-flow math.
    const date = dateRaw || todayYmd();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { error: "Invalid date format" };
    }

    const check = await checkDateEditable(supabase, spaceId, date);
    if (!check.ok) return { error: check.error };

    const { error } = await supabase.from("entries").insert({
      space_id: spaceId,
      date,
      name,
      amount,
      currency: "BRL",
      category: categoryRaw || null,
      notes: notesRaw || null,
      paid: false,
      skipped: false,
      template_id: null,
      installments_covered: 1,
    });

    if (error) return { error: `Failed to create entry: ${error.message}` };

    revalidatePath(spaceMonthUrl(spaceId, viewedYear, viewedMonth));
    if (check.year !== viewedYear || check.month !== viewedMonth) {
      revalidatePath(spaceMonthUrl(spaceId, check.year, check.month));
    }
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
}
