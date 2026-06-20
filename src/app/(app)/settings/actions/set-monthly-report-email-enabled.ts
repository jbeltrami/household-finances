"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePersonalSpaceId } from "@/helpers/spaces";
import { settingsUrl } from "@/helpers/paths";

// RLS (is_active_member) gates the upsert; there's no extra
// app-layer ownership check because the only member of a personal
// space is its owner.
export async function setMonthlyReportEmailEnabled(
  enabled: boolean
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const spaceId = await requirePersonalSpaceId(supabase);

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
