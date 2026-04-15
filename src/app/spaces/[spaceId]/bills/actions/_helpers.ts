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
  dueDay: number | null;
};

// Shared parser/validator for the create and update forms.
export function parseTemplateFields(formData: FormData): TemplateFields {
  const name = formData.get("name")?.toString().trim();
  const defaultAmountRaw = formData.get("default_amount")?.toString();
  const dueDayRaw = formData.get("due_day")?.toString();

  if (!name) throw new Error("Name is required");
  if (!defaultAmountRaw) throw new Error("Default amount is required");

  const defaultAmount = Number(defaultAmountRaw);
  if (!Number.isFinite(defaultAmount) || defaultAmount < 0) {
    throw new Error("Default amount must be a positive number");
  }

  let dueDay: number | null = null;
  if (dueDayRaw) {
    dueDay = Number(dueDayRaw);
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
      throw new Error("Due day must be an integer between 1 and 31");
    }
  }

  return { name, defaultAmount, dueDay };
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
