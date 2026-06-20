"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePersonalSpaceId } from "@/helpers/spaces";
import { settingsUrl } from "@/helpers/paths";

// Toggle WhatsApp alerts on/off. Refuses enabling if no phone is
// saved yet — the UI also disables the toggle in that case, but
// this is defense in depth (and the DB CHECK is the final gate).
export async function setWhatsAppEnabled(enabled: boolean): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const spaceId = await requirePersonalSpaceId(supabase);

  if (enabled) {
    const { data: existing } = await supabase
      .from("whatsapp_notification_settings")
      .select("phone_e164")
      .eq("space_id", spaceId)
      .maybeSingle();

    if (!existing?.phone_e164) {
      throw new Error("Salve um número de telefone antes de ativar os avisos");
    }
  }

  const { error } = await supabase
    .from("whatsapp_notification_settings")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("space_id", spaceId);

  if (error) throw new Error(`Falha ao atualizar: ${error.message}`);

  revalidatePath(settingsUrl());
}
