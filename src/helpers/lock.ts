// Month-lock helpers for the ledger model.
//
// Locking has moved from a flag on the `months` table (old model) to
// a dedicated `month_unlocks` side table. A past month is effectively
// locked unless there's a matching row in `month_unlocks` explaining
// why it was unlocked. Current and future months are always editable.
//
// Two flavors of check:
//   isMonthLocked({year, month, hasUnlock}) — pure, for page renders
//   checkDateEditable(supabase, spaceId, date)  — fetches the unlock
//       row and decides; used by every mutation server action as
//       defense in depth against edits to past months.

import type { SupabaseClient } from "@supabase/supabase-js";
import { parseYearMonthFromYmd } from "./date";
import type { EditCheckResult } from "./types";

export function isMonthLocked(args: {
  year: number;
  month: number;
  hasUnlock: boolean;
}): boolean {
  if (args.hasUnlock) return false;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (args.year < currentYear) return true;
  if (args.year === currentYear && args.month < currentMonth) return true;
  return false;
}

export async function fetchMonthUnlock(
  supabase: SupabaseClient,
  spaceId: string,
  year: number,
  month: number
): Promise<{ reason: string } | null> {
  const { data } = await supabase
    .from("month_unlocks")
    .select("reason")
    .eq("space_id", spaceId)
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();
  return data ?? null;
}

// Given a space and a date, check whether mutating a row scoped to
// that (space, date) would hit a locked month. Used for virtual-
// occurrence writes where there's no materialized row id to look up.
export async function checkDateEditable(
  supabase: SupabaseClient,
  spaceId: string,
  date: string
): Promise<EditCheckResult> {
  const parsed = parseYearMonthFromYmd(date);
  if (!parsed) return { ok: false, error: "Invalid date" };

  const unlock = await fetchMonthUnlock(
    supabase,
    spaceId,
    parsed.year,
    parsed.month
  );

  if (
    isMonthLocked({
      year: parsed.year,
      month: parsed.month,
      hasUnlock: unlock != null,
    })
  ) {
    return {
      ok: false,
      error: "This month is locked. Unlock it before editing.",
    };
  }

  return { ok: true, spaceId, year: parsed.year, month: parsed.month };
}

// Given an entries row id, look up its space_id + date and run the
// same lock check. Returns the space + year/month coordinates on
// success so callers can revalidate the right path without a second
// lookup.
export async function checkEntryEditable(
  supabase: SupabaseClient,
  entryId: string
): Promise<EditCheckResult> {
  const { data } = await supabase
    .from("entries")
    .select("space_id, date")
    .eq("id", entryId)
    .maybeSingle();

  if (!data) return { ok: false, error: "Entry not found" };

  return checkDateEditable(supabase, data.space_id, data.date);
}

// Same pattern for income_entries.
export async function checkIncomeEntryEditable(
  supabase: SupabaseClient,
  entryId: string
): Promise<EditCheckResult> {
  const { data } = await supabase
    .from("income_entries")
    .select("space_id, expected_date")
    .eq("id", entryId)
    .maybeSingle();

  if (!data) return { ok: false, error: "Income entry not found" };

  return checkDateEditable(supabase, data.space_id, data.expected_date);
}
