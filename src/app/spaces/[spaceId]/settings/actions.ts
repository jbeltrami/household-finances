"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type FormState = { error: string | null };

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
