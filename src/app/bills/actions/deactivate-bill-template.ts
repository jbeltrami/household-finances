"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function deactivateBillTemplate(id: string, formData: FormData) {
  // `formData` is unused — the form has no fields — but the signature is
  // required because `.bind(null, id)` still forwards FormData at call time.
  void formData;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("recurring_bill_templates")
    .update({ active: false })
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to deactivate template: ${error.message}`);
  }

  revalidatePath("/bills");
}
