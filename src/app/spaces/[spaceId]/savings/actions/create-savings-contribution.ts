"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  spaceFundUrl,
  spaceMonthUrl,
  spaceSavingsUrl,
} from "@/helpers/paths";
import { checkDateEditable } from "@/helpers/lock";
import type { FormState } from "../form-state";
import { parseContributionFields } from "./_helpers";

// Create a contribution against a specific fund. Contributions are
// date-keyed (no more month_id); the lock check runs against the
// target month so adding to a past locked month stays blocked.
export async function createSavingsContribution(
  fundId: string,
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

    const { signedAmount, date, year, month, notes } =
      parseContributionFields(formData);

    const { data: fund } = await supabase
      .from("savings_funds")
      .select("space_id")
      .eq("id", fundId)
      .single();
    if (!fund) return { error: "Fund not found" };

    const check = await checkDateEditable(supabase, fund.space_id, date);
    if (!check.ok) return { error: check.error };

    const { error } = await supabase.from("savings_contributions").insert({
      fund_id: fundId,
      date,
      amount: signedAmount,
      notes,
    });

    if (error) {
      return { error: `Failed to create contribution: ${error.message}` };
    }

    revalidatePath(spaceSavingsUrl(fund.space_id));
    revalidatePath(spaceFundUrl(fund.space_id, fundId));
    revalidatePath(spaceMonthUrl(fund.space_id, year, month));

    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
}
