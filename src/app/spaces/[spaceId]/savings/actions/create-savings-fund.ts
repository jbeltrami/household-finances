"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { spaceSavingsUrl } from "@/helpers/paths";
import type { FormState } from "../form-state";
import { parseFundFields } from "./_helpers";

export async function createSavingsFund(
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

    // spaceId comes from a hidden field on the form. RLS gates the
    // insert — a forged value will be rejected by the policy.
    const spaceId = formData.get("space_id")?.toString();
    if (!spaceId) return { error: "Missing space context" };

    const { name, startingBalance } = parseFundFields(formData);

    const { error } = await supabase.from("savings_funds").insert({
      space_id: spaceId,
      name,
      currency: "BRL",
      starting_balance: startingBalance,
    });

    if (error) return { error: `Failed to create fund: ${error.message}` };

    revalidatePath(spaceSavingsUrl(spaceId));
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
}
