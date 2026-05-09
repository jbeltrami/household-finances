"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { billsUrl } from "@/helpers/paths";

export async function deactivateBillTemplate(id: string, formData: FormData) {
  // spaceId is read from a hidden field; the bound arg is `id`. The form
  // still forwards FormData even though it's otherwise empty, which is
  // how we get access to the hidden space_id.
  const spaceId = formData.get("space_id")?.toString();
  if (!spaceId) throw new Error("Missing space context");

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

  revalidatePath(billsUrl());
}
