"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/helpers/session";
import { financingDetailUrl } from "@/helpers/paths";

// Toggle-style (useTransition) — throws on failure. `financingId` is passed
// in so we can revalidate the detail page without an extra lookup.
export async function deleteExtraPayment(id: string, financingId: string) {
  const supabase = await createClient();

  await requireSession(supabase);

  const { error } = await supabase
    .from("financing_extra_payments")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Falha ao remover a amortização: ${error.message}`);
  }

  revalidatePath(financingDetailUrl(financingId));
}
