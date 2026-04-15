"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "../form-state";
import { getPersonalSpace, parseFundFields } from "./_helpers";

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

    const space = await getPersonalSpace(supabase);
    const { name, startingBalance } = parseFundFields(formData);

    const { error } = await supabase.from("savings_funds").insert({
      space_id: space.id,
      name,
      currency: "BRL",
      starting_balance: startingBalance,
    });

    if (error) return { error: `Failed to create fund: ${error.message}` };

    revalidatePath("/savings");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
}
