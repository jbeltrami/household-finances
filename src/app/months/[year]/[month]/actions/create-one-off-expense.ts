"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type FormState } from "../form-state";
import { getOrCreateMonth, isMonthLocked, monthUrl } from "../_helpers";

export async function createOneOffExpense(
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

    // Parse and validate inputs.
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

    let date: string | null = null;
    if (dateRaw) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
        return { error: "Invalid date format" };
      }
      date = dateRaw;
    }

    const category = categoryRaw || null;
    const notes = notesRaw || null;

    // Fetch the viewed month to get space_id and lock state. Same approach
    // as createIncomeEntry: the viewed month is the default target, but a
    // date in a different month redirects the expense there.
    const { data: viewedMonthRow } = await supabase
      .from("months")
      .select("year, month, unlock_reason, space_id")
      .eq("id", monthId)
      .single();

    if (!viewedMonthRow) return { error: "Month not found" };

    let targetMonth = {
      id: monthId,
      year: viewedMonthRow.year,
      month: viewedMonthRow.month,
      unlock_reason: viewedMonthRow.unlock_reason,
    };

    if (date) {
      const [dateYear, dateMonth] = date.split("-").map(Number);

      if (
        !Number.isInteger(dateYear) ||
        dateYear < 2000 ||
        dateYear > 2100 ||
        !Number.isInteger(dateMonth) ||
        dateMonth < 1 ||
        dateMonth > 12
      ) {
        return { error: "Invalid date" };
      }

      if (
        dateYear !== viewedMonthRow.year ||
        dateMonth !== viewedMonthRow.month
      ) {
        const created = await getOrCreateMonth(
          supabase,
          viewedMonthRow.space_id,
          dateYear,
          dateMonth
        );
        targetMonth = {
          id: created.id,
          year: created.year,
          month: created.month,
          unlock_reason: created.unlock_reason,
        };
      }
    }

    // Lock check runs against the target month, not the viewed month.
    if (isMonthLocked(targetMonth)) {
      return {
        error:
          "The target month is locked. Unlock that month before adding expenses there.",
      };
    }

    const { error: insertError } = await supabase
      .from("one_off_expenses")
      .insert({
        month_id: targetMonth.id,
        space_id: viewedMonthRow.space_id,
        name,
        amount,
        currency: "BRL",
        date,
        category,
        notes,
      });

    if (insertError) {
      return { error: `Failed to create expense: ${insertError.message}` };
    }

    revalidatePath(monthUrl(year, month));
    if (targetMonth.year !== year || targetMonth.month !== month) {
      revalidatePath(monthUrl(targetMonth.year, targetMonth.month));
    }

    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
}
