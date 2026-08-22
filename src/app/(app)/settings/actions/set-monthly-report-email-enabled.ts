"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/helpers/session";
import { settingsUrl } from "@/helpers/paths";

// RLS (is_active_member) gates the upsert; there's no extra
// app-layer ownership check because the only member of a personal
// space is its owner.
export async function setMonthlyReportEmailEnabled(
  enabled: boolean
): Promise<void> {
  const supabase = await createClient();

  const { spaceId } = await requireSession(supabase);


  const { error } = await supabase
    .from("monthly_report_settings")
    .upsert(
      { space_id: spaceId, enabled },
      { onConflict: "space_id" }
    );

  if (error) {
    throw new Error(`Falha ao atualizar a configuração: ${error.message}`);
  }

  revalidatePath(settingsUrl());
}
