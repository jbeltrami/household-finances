"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPersonalSpaceId } from "@/helpers/spaces";

// Accept an invitation:
//   1. Mark the invite as accepted (UPDATE — invitee policy)
//   2. Insert a space_members row (INSERT — invitee policy from 0012)
//   3. Link the invitee's personal space to the shared space
//      (UPDATE spaces — created_by = auth.uid() policy from 0011)
//
// The three writes must happen in this order because the
// space_members INSERT policy checks for an *accepted* invitation.
export async function acceptInvitation(
  invitationId: string,
  spaceId: string,
  formData: FormData
): Promise<void> {
  void formData;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // 1. Mark accepted.
  const { error: acceptError } = await supabase
    .from("invitations")
    .update({ status: "accepted", responded_at: new Date().toISOString() })
    .eq("id", invitationId);

  if (acceptError) {
    throw new Error(`Failed to accept: ${acceptError.message}`);
  }

  // 2. Add self as member.
  const { error: memberError } = await supabase
    .from("space_members")
    .insert({
      space_id: spaceId,
      user_id: user.id,
      role: "member",
    });

  if (memberError) {
    throw new Error(`Failed to join space: ${memberError.message}`);
  }

  // 3. Link personal space.
  const personalSpaceId = await getPersonalSpaceId(supabase);
  if (personalSpaceId) {
    await supabase
      .from("spaces")
      .update({ parent_space_id: spaceId })
      .eq("id", personalSpaceId);
  }

  // Bust layout cache so the Navbar picks up the new membership.
  revalidatePath("/", "layout");
}

// Decline an invitation: just mark it declined, nothing else changes.
export async function declineInvitation(
  invitationId: string,
  formData: FormData
): Promise<void> {
  void formData;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("invitations")
    .update({ status: "declined", responded_at: new Date().toISOString() })
    .eq("id", invitationId);

  if (error) {
    throw new Error(`Failed to decline: ${error.message}`);
  }

  revalidatePath("/", "layout");
}
