"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePersonalSpaceId } from "@/helpers/spaces";
import { settingsUrl } from "@/helpers/paths";

// E.164 — leading +, country code 1-9, then 6-14 more digits.
// Mirrors the CHECK constraint on whatsapp_notification_settings.
const E164_REGEX = /^\+[1-9][0-9]{6,14}$/;

// Save (or update) the phone number for WhatsApp overdue alerts.
// Always upserts with `enabled` left to its current state — the
// toggle is a separate action. New rows default to enabled=false.
//
// Returns the normalized phone on success so the client can sync
// its "saved phone" state without re-reading from the DB.
export async function saveWhatsAppPhone(
  formData: FormData
): Promise<{ error: string | null; phone: string | null }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado", phone: null };

    const spaceId = await requirePersonalSpaceId(supabase);

    const raw = formData.get("phone")?.toString().trim() ?? "";
    if (!raw) return { error: "O número de telefone é obrigatório", phone: null };

    // Normalize: strip spaces/dashes the user might type, prepend
    // `+` if missing. Final shape must match the E.164 regex.
    const stripped = raw.replace(/[\s-]/g, "");
    const phone = stripped.startsWith("+") ? stripped : `+${stripped}`;

    if (!E164_REGEX.test(phone)) {
      return {
        error:
          "Formato de telefone inválido. Use o formato internacional (ex.: +5511987654321).",
        phone: null,
      };
    }

    // Upsert. If a row already exists, update phone only — don't
    // touch enabled (toggle is a separate action). If it doesn't,
    // insert with enabled=false (DB default).
    const { data: existing } = await supabase
      .from("whatsapp_notification_settings")
      .select("space_id")
      .eq("space_id", spaceId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("whatsapp_notification_settings")
        .update({ phone_e164: phone, updated_at: new Date().toISOString() })
        .eq("space_id", spaceId);
      if (error) {
        return { error: `Falha ao salvar o telefone: ${error.message}`, phone: null };
      }
    } else {
      const { error } = await supabase
        .from("whatsapp_notification_settings")
        .insert({ space_id: spaceId, phone_e164: phone, enabled: false });
      if (error) {
        return { error: `Falha ao salvar o telefone: ${error.message}`, phone: null };
      }
    }

    revalidatePath(settingsUrl());
    return { error: null, phone };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Algo deu errado",
      phone: null,
    };
  }
}
