// Shared helpers used by the bill template actions.
//
// This file is intentionally NOT marked with `"use server"` because it
// exports synchronous utilities and types. A `"use server"` file can only
// export async functions, so internal helpers must live in a plain module.
//
// The `_` prefix is a Next.js convention for private files that aren't
// routes — it signals intent.

import type { SupabaseClient } from "@supabase/supabase-js";

// Postgres error code for unique_violation (when our partial unique index
// rejects a duplicate active name).
export const UNIQUE_VIOLATION = "23505";

export type TemplateFields = {
  name: string;
  defaultAmount: number;
  cadence: "monthly" | "weekly" | "biweekly";
  dueDay: number | null;
  dayOfWeek: number | null;
};

// Shared parser/validator for the create and update forms.
export function parseTemplateFields(formData: FormData): TemplateFields {
  const name = formData.get("name")?.toString().trim();
  const defaultAmountRaw = formData.get("default_amount")?.toString();
  const cadenceRaw = formData.get("cadence")?.toString() ?? "monthly";

  if (!name) throw new Error("Name is required");
  if (!defaultAmountRaw) throw new Error("Default amount is required");

  const defaultAmount = Number(defaultAmountRaw);
  if (!Number.isFinite(defaultAmount) || defaultAmount < 0) {
    throw new Error("Default amount must be a positive number");
  }

  if (
    cadenceRaw !== "monthly" &&
    cadenceRaw !== "weekly" &&
    cadenceRaw !== "biweekly"
  ) {
    throw new Error("Cadence must be monthly, weekly, or biweekly");
  }
  const cadence = cadenceRaw;

  let dueDay: number | null = null;
  let dayOfWeek: number | null = null;

  if (cadence === "monthly") {
    const dueDayRaw = formData.get("due_day")?.toString();
    if (dueDayRaw) {
      dueDay = Number(dueDayRaw);
      if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
        throw new Error("Due day must be an integer between 1 and 31");
      }
    }
  } else {
    // weekly or biweekly — day_of_week is required
    const dowRaw = formData.get("day_of_week")?.toString();
    if (dowRaw == null || dowRaw === "") {
      throw new Error("Day of week is required for weekly/biweekly bills");
    }
    dayOfWeek = Number(dowRaw);
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      throw new Error("Day of week must be 0 (Sun) through 6 (Sat)");
    }
  }

  return { name, defaultAmount, cadence, dueDay, dayOfWeek };
}

// Compute the biweekly anchor: the next occurrence of `dayOfWeek`
// on or after today. This sets the phase for biweekly billing —
// all future/past biweekly dates are computed in 14-day steps from
// this anchor.
export function computeBiweeklyAnchor(dayOfWeek: number): string {
  const today = new Date();
  let daysUntil = dayOfWeek - today.getDay();
  if (daysUntil < 0) daysUntil += 7;
  const target = new Date(today);
  target.setDate(target.getDate() + daysUntil);
  const yyyy = String(target.getFullYear()).padStart(4, "0");
  const mm = String(target.getMonth() + 1).padStart(2, "0");
  const dd = String(target.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Cascade an amount change to unpaid bill instances in the current or
// future months. Past months are auto-locked, so we don't touch them
// even though they wouldn't match the filter anyway.
export async function cascadeAmountToFutureInstances(
  supabase: SupabaseClient,
  templateId: string,
  newAmount: number
) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // JS months are 0-indexed

  // Find months that are current or later.
  const { data: months } = await supabase
    .from("months")
    .select("id")
    .or(
      `year.gt.${currentYear},and(year.eq.${currentYear},month.gte.${currentMonth})`
    );

  if (!months || months.length === 0) return;

  const monthIds = months.map((m) => m.id);

  await supabase
    .from("bill_instances")
    .update({ amount: newAmount })
    .eq("template_id", templateId)
    .eq("paid", false)
    .in("month_id", monthIds);
}
