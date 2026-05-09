"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendWhatsAppText } from "@/lib/whatsapp/client";

type FormState = { error: string | null };

// E.164 — leading +, country code 1-9, then 6-14 more digits.
// Mirrors the CHECK constraint on whatsapp_notification_settings.
const E164_REGEX = /^\+[1-9][0-9]{6,14}$/;

// --- Rename -------------------------------------------------------

export async function renameSpace(
  spaceId: string,
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
    if (name.length < 2) return { error: "Name must be at least 2 characters" };

    const { error } = await supabase
      .from("spaces")
      .update({ name })
      .eq("id", spaceId);

    if (error) return { error: `Failed to rename: ${error.message}` };

    // Bust the layout cache so the Navbar dropdown picks up the new name.
    revalidatePath("/", "layout");
    revalidatePath(`/spaces/${spaceId}/settings`);
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
}

// --- Invite -------------------------------------------------------

export async function inviteMember(
  spaceId: string,
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

    const email = formData.get("email")?.toString().trim().toLowerCase();
    if (!email) return { error: "Email is required" };

    // Basic email validation — the real check is whether the person
    // eventually signs up with this address via Google OAuth.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { error: "Invalid email address" };
    }

    // Don't let the owner invite themselves.
    if (email === user.email?.toLowerCase()) {
      return { error: "You can't invite yourself" };
    }

    const { error } = await supabase.from("invitations").insert({
      space_id: spaceId,
      invited_email: email,
      invited_by: user.id,
    });

    if (error) {
      // Unique constraint on (space_id, invited_email)
      if (error.code === "23505") {
        return { error: "This email has already been invited to this space" };
      }
      return { error: `Failed to send invite: ${error.message}` };
    }

    revalidatePath(`/spaces/${spaceId}/settings`);
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
}

// --- Monthly report email toggle ----------------------------------

// Personal-space-only setting. RLS (is_active_member) gates the
// upsert; there's no extra app-layer ownership check because for a
// personal space the only active member is the owner.
export async function setMonthlyReportEmailEnabled(
  spaceId: string,
  enabled: boolean
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("monthly_report_settings")
    .upsert(
      { space_id: spaceId, enabled },
      { onConflict: "space_id" }
    );

  if (error) {
    throw new Error(`Failed to update setting: ${error.message}`);
  }

  revalidatePath(`/spaces/${spaceId}/settings`);
}

// --- Revoke invite ------------------------------------------------

export async function revokeInvitation(
  invitationId: string,
  formData: FormData
): Promise<void> {
  void formData;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // The DELETE RLS policy (is_space_owner) enforces that only the
  // owner can revoke. We don't need to check ownership in app code.
  const { error } = await supabase
    .from("invitations")
    .delete()
    .eq("id", invitationId);

  if (error) throw new Error(`Failed to revoke: ${error.message}`);

  // We don't know the spaceId here without an extra lookup, but
  // revalidating the layout is cheap and covers all settings pages.
  revalidatePath("/", "layout");
}

// --- WhatsApp notifications ---------------------------------------

// Save (or update) the phone number for WhatsApp overdue alerts.
// Always upserts with `enabled` left to its current state — the
// toggle is a separate action. New rows default to enabled=false.
//
// Returns the normalized phone on success so the client can sync
// its "saved phone" state without re-reading from the DB.
export async function saveWhatsAppPhone(
  spaceId: string,
  formData: FormData
): Promise<{ error: string | null; phone: string | null }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated", phone: null };

    const raw = formData.get("phone")?.toString().trim() ?? "";
    if (!raw) return { error: "Phone number is required", phone: null };

    // Normalize: strip spaces/dashes the user might type, prepend
    // `+` if missing. Final shape must match the E.164 regex.
    const stripped = raw.replace(/[\s-]/g, "");
    const phone = stripped.startsWith("+") ? stripped : `+${stripped}`;

    if (!E164_REGEX.test(phone)) {
      return {
        error:
          "Invalid phone format. Use international form (e.g. +5511987654321).",
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
        return { error: `Failed to save phone: ${error.message}`, phone: null };
      }
    } else {
      const { error } = await supabase
        .from("whatsapp_notification_settings")
        .insert({ space_id: spaceId, phone_e164: phone, enabled: false });
      if (error) {
        return { error: `Failed to save phone: ${error.message}`, phone: null };
      }
    }

    revalidatePath(`/spaces/${spaceId}/settings`);
    return { error: null, phone };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Something went wrong",
      phone: null,
    };
  }
}

// Toggle WhatsApp alerts on/off. Refuses enabling if no phone is
// saved yet — the UI also disables the toggle in that case, but
// this is defense in depth (and the DB CHECK is the final gate).
export async function setWhatsAppEnabled(
  spaceId: string,
  enabled: boolean
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (enabled) {
    const { data: existing } = await supabase
      .from("whatsapp_notification_settings")
      .select("phone_e164")
      .eq("space_id", spaceId)
      .maybeSingle();

    if (!existing?.phone_e164) {
      throw new Error("Save a phone number before enabling alerts");
    }
  }

  const { error } = await supabase
    .from("whatsapp_notification_settings")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("space_id", spaceId);

  if (error) throw new Error(`Failed to update: ${error.message}`);

  revalidatePath(`/spaces/${spaceId}/settings`);
}

// Send a one-off test WhatsApp message to the saved phone. Uses
// the user's RLS-bound session client to read the phone, so a user
// can never trigger a test to someone else's number. Returns a
// friendly state object rather than throwing — the UI surfaces it
// inline.
export async function sendWhatsAppTestMessage(
  spaceId: string
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated" };

    const { data: settings } = await supabase
      .from("whatsapp_notification_settings")
      .select("phone_e164")
      .eq("space_id", spaceId)
      .maybeSingle();

    if (!settings?.phone_e164) {
      return { ok: false, error: "Save a phone number first" };
    }

    await sendWhatsAppText(
      settings.phone_e164,
      "Olá! Esta é uma mensagem de teste do Home Finances. Se você recebeu isto, as notificações estão funcionando."
    );

    return { ok: true, error: null };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to send test message",
    };
  }
}
