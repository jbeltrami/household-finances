// Shared helpers for the savings route's server actions. NOT a
// "use server" file — only sync utilities and type exports live here.
// The `_` prefix marks it as a non-routed internal module.

import type { SupabaseClient } from "@supabase/supabase-js";

export type FundFields = {
  name: string;
  startingBalance: number;
};

// Parse and validate a fund-create/rename payload. Starting balance is
// optional on the form and defaults to 0.
export function parseFundFields(formData: FormData): FundFields {
  const name = formData.get("name")?.toString().trim();
  const startingBalanceRaw = formData.get("starting_balance")?.toString();

  if (!name) throw new Error("Name is required");

  let startingBalance = 0;
  if (startingBalanceRaw) {
    startingBalance = Number(startingBalanceRaw);
    if (!Number.isFinite(startingBalance) || startingBalance < 0) {
      throw new Error("Starting balance must be a non-negative number");
    }
  }

  return { name, startingBalance };
}

export type ContributionFields = {
  // Already sign-flipped: positive for deposits, negative for withdrawals.
  signedAmount: number;
  year: number;
  month: number;
  notes: string | null;
};

// Parse a contribution payload. The UI offers two buttons — "Deposit" and
// "Withdraw" — which set the `type` field; amount is always entered as a
// positive number and we apply the sign here. Month comes from a native
// <input type="month"> which yields "YYYY-MM".
export function parseContributionFields(formData: FormData): ContributionFields {
  const amountRaw = formData.get("amount")?.toString();
  const type = formData.get("type")?.toString();
  const monthRaw = formData.get("month")?.toString();
  const notesRaw = formData.get("notes")?.toString().trim();

  if (!amountRaw) throw new Error("Amount is required");
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be a positive number");
  }

  if (type !== "deposit" && type !== "withdraw") {
    throw new Error("Type must be 'deposit' or 'withdraw'");
  }
  const signedAmount = type === "deposit" ? amount : -amount;

  if (!monthRaw || !/^\d{4}-\d{2}$/.test(monthRaw)) {
    throw new Error("Month is required");
  }
  const [yStr, mStr] = monthRaw.split("-");
  const year = Number(yStr);
  const month = Number(mStr);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("Invalid year");
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Invalid month");
  }

  return {
    signedAmount,
    year,
    month,
    notes: notesRaw ? notesRaw : null,
  };
}

// Look up a contribution's fund and parent month. Used by update/delete
// actions for lock enforcement: they need to know which month the
// contribution lives in so they can reject edits to locked months.
// Also returns spaceId (pulled from the parent months row) so callers
// can build space-prefixed revalidatePath URLs without a second lookup.
export async function fetchContributionContext(
  supabase: SupabaseClient,
  contributionId: string
): Promise<{
  fundId: string;
  monthId: string;
  spaceId: string;
  year: number;
  month: number;
  unlock_reason: string | null;
} | null> {
  const { data } = await supabase
    .from("savings_contributions")
    .select(
      "fund_id, month_id, months!inner(space_id, year, month, unlock_reason)"
    )
    .eq("id", contributionId)
    .single();

  if (!data) return null;

  const m = (data as unknown as {
    fund_id: string;
    month_id: string;
    months: {
      space_id: string;
      year: number;
      month: number;
      unlock_reason: string | null;
    };
  });

  return {
    fundId: m.fund_id,
    monthId: m.month_id,
    spaceId: m.months.space_id,
    year: m.months.year,
    month: m.months.month,
    unlock_reason: m.months.unlock_reason,
  };
}
