"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type FormState } from "../form-state";
import { getOrCreateMonth, isMonthLocked, monthUrl } from "../_helpers";

export async function createIncomeEntry(
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

    // Parse and validate inputs first.
    const name = formData.get("name")?.toString().trim();
    const amountRaw = formData.get("amount")?.toString();
    const expectedDateRaw = formData.get("expected_date")?.toString().trim();

    if (!name) return { error: "Name is required" };
    if (!amountRaw) return { error: "Amount is required" };

    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount < 0) {
      return { error: "Amount must be a positive number" };
    }

    // expected_date is optional. The HTML date input gives us a YYYY-MM-DD
    // string when filled, or empty when blank.
    let expectedDate: string | null = null;
    if (expectedDateRaw) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(expectedDateRaw)) {
        return { error: "Invalid date format" };
      }
      expectedDate = expectedDateRaw;
    }

    // Fetch the viewed month for its space_id and (if no date was supplied)
    // its lock state.
    const { data: viewedMonthRow } = await supabase
      .from("months")
      .select("year, month, unlock_reason, space_id")
      .eq("id", monthId)
      .single();

    if (!viewedMonthRow) return { error: "Month not found" };

    // Determine the target month: by default the viewed month, but if the
    // user provided a date that falls in a different month, switch to that
    // one. We look it up (or lazily create it) via getOrCreateMonth so the
    // row exists before we insert the income entry referencing it.
    let targetMonth = {
      id: monthId,
      year: viewedMonthRow.year,
      month: viewedMonthRow.month,
      unlock_reason: viewedMonthRow.unlock_reason,
    };

    if (expectedDate) {
      const [dateYear, dateMonth] = expectedDate.split("-").map(Number);

      // Sanity-check the parsed year/month before touching the months table.
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
    // Adding income to a past locked month is blocked even if the page
    // you're viewing happens to be unlocked.
    if (isMonthLocked(targetMonth)) {
      return {
        error:
          "The target month is locked. Unlock that month before adding income there.",
      };
    }

    const { error: insertError } = await supabase
      .from("income_entries")
      .insert({
        month_id: targetMonth.id,
        space_id: viewedMonthRow.space_id,
        name,
        amount,
        currency: "BRL",
        expected_date: expectedDate,
        received: false,
      });

    if (insertError) {
      return { error: `Failed to create income entry: ${insertError.message}` };
    }

    // Revalidate the currently viewed month so the page the user is on
    // refreshes. If the entry actually landed in a different month, also
    // revalidate that month's path so it picks up the new row.
    revalidatePath(monthUrl(year, month));
    if (targetMonth.year !== year || targetMonth.month !== month) {
      revalidatePath(monthUrl(targetMonth.year, targetMonth.month));
    }

    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
}
