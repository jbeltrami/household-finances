"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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

    const { error } = await supabase
      .from("savings_funds")
      .update({ name })
      .eq("id", fundId);

    if (error) return { error: `Failed to update fund: ${error.message}` };

    revalidatePath("/savings");
    revalidatePath(`/savings/${fundId}`);
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
}
