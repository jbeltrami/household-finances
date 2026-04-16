"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { spaceMonthUrl } from "@/helpers/paths";

type FormState = { error: string | null };

export async function createSharedSpace(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  void prevState;

  let newSpaceId: string | undefined;

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const name = formData.get("name")?.toString().trim();
    if (!name) return { error: "Name is required" };
    if (name.length < 2) return { error: "Name must be at least 2 characters" };

    // 1. Create the shared space. We generate the UUID server-side
    // and pass it in the insert so we don't need .select().single()
    // on the response. Without this, PostgREST's RETURNING clause
    // gets blocked by the SELECT policy (can_read_space), which
    // checks membership — but we haven't added the creator as a
    // member yet (that's step 2). Classic Supabase RETURNING + RLS
    // chicken-and-egg.
    newSpaceId = crypto.randomUUID();

    const { error: spaceError } = await supabase.from("spaces").insert({
      id: newSpaceId,
      name,
      type: "shared",
      created_by: user.id,
    });

    if (spaceError) {
      return { error: `Failed to create space: ${spaceError.message}` };
    }

    // 2. Add the creator as the owner.
    const { error: memberError } = await supabase
      .from("space_members")
      .insert({
        space_id: newSpaceId,
        user_id: user.id,
        role: "owner",
      });

    if (memberError) {
      return { error: `Failed to add you as owner: ${memberError.message}` };
    }

    // 3. Link the creator's personal space to the new shared space.
    // This makes the personal space's entries roll up into the shared-
    // space aggregate view once Step 8's aggregate query layer lands.
    const { error: linkError } = await supabase
      .from("spaces")
      .update({ parent_space_id: newSpaceId })
      .eq("type", "personal")
      .eq("created_by", user.id);

    if (linkError) {
      return { error: `Failed to link personal space: ${linkError.message}` };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }

  // Bust the root layout cache so the Navbar re-renders with the
  // new space in the switcher dropdown.
  revalidatePath("/", "layout");

  // redirect() must be outside try/catch — it throws a Next.js
  // sentinel error that the framework catches internally.
  if (!newSpaceId) return { error: "Something went wrong" };
  const now = new Date();
  redirect(spaceMonthUrl(newSpaceId, now.getFullYear(), now.getMonth() + 1));
}
