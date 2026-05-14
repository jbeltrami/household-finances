"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendWhatsAppText } from "@/lib/whatsapp/client";
import { requirePersonalSpaceId } from "@/helpers/spaces";
import { settingsUrl } from "@/helpers/paths";

type FormState = { error: string | null };

// E.164 — leading +, country code 1-9, then 6-14 more digits.
// Mirrors the CHECK constraint on whatsapp_notification_settings.
const E164_REGEX = /^\+[1-9][0-9]{6,14}$/;

// --- Rename -------------------------------------------------------

export async function renameSpace(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  void prevState;

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    const spaceId = await requirePersonalSpaceId(supabase);

    const name = formData.get("name")?.toString().trim();
    if (!name) return { error: "O nome é obrigatório" };
    if (name.length < 2) return { error: "O nome precisa ter pelo menos 2 caracteres" };

    const { error } = await supabase
      .from("spaces")
      .update({ name })
      .eq("id", spaceId);

    if (error) return { error: `Falha ao renomear: ${error.message}` };

    // Bust the layout cache so the Navbar dropdown picks up the new name.
    revalidatePath("/", "layout");
    revalidatePath(settingsUrl());
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Algo deu errado" };
  }
}

// --- Monthly report email toggle ----------------------------------

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

// --- WhatsApp notifications ---------------------------------------

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
