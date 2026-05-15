"use server";

import { createClient } from "@/lib/supabase/server";
import { sendWhatsAppText } from "@/lib/whatsapp/client";
import { requirePersonalSpaceId } from "@/helpers/spaces";

// Send a one-off test WhatsApp message to the saved phone. Uses
// the user's RLS-bound session client to read the phone, so a user
// can never trigger a test to someone else's number. Returns a
// friendly state object rather than throwing — the UI surfaces it
// inline.
export async function sendWhatsAppTestMessage(): Promise<{
  ok: boolean;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Não autenticado" };

    const spaceId = await requirePersonalSpaceId(supabase);

    const { data: settings } = await supabase
      .from("whatsapp_notification_settings")
      .select("phone_e164")
      .eq("space_id", spaceId)
      .maybeSingle();

    if (!settings?.phone_e164) {
      return { ok: false, error: "Salve um número de telefone primeiro" };
    }

    await sendWhatsAppText(
      settings.phone_e164,
      "Olá! Esta é uma mensagem de teste do Home Finances. Se você recebeu isto, as notificações estão funcionando."
    );

    return { ok: true, error: null };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Falha ao enviar mensagem de teste",
    };
  }
}
