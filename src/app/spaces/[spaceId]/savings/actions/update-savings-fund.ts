"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { spaceFundUrl, spaceSavingsUrl } from "@/helpers/paths";
import type { FormState } from "../form-state";

// Rename a fund. Piece 7 intentionally keeps fund mutation to rename only
// — starting balance and deletion are deferred. Expanding this later is
// trivial: parse more fields and pass them to the update call.
export async function updateSavingsFund(
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

    const name = formData.get("name")?.toString().trim();
    if (!name) return { error: "Name is required" };

    // Look up the fund's space_id so we can build space-prefixed
    // revalidatePath URLs. RLS ensures we only see funds we can access.
    const { data: fund } = await supabase
      .from("savings_funds")
      .select("space_id")
      .eq("id", fundId)
      .single();
    if (!fund) return { error: "Fund not found" };

    const { error } = await supabase
      .from("savings_funds")
      .update({ name })
      .eq("id", fundId);

    if (error) return { error: `Failed to update fund: ${error.message}` };

    revalidatePath(spaceSavingsUrl(fund.space_id));
    revalidatePath(spaceFundUrl(fund.space_id, fundId));
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
}
