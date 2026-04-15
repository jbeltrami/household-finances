// Cross-route helpers for looking up space context. Currently just one
// function — the lookup that every perimeter page (Navbar, root redirect,
// eventually the dashboard) needs to route users into their default
// budget context.

import type { SupabaseClient } from "@supabase/supabase-js";

// Returns the currently authenticated user's personal space ID, or null
// if the lookup fails.
//
// Every user gets exactly one personal space auto-created on first
// Google login via the `on_auth_user_created` trigger defined in 0001,
// so for an authenticated session this should always return a string.
// We still return `string | null` so callers handle the edge case
// defensively — a missing row would mean the trigger failed or the
// user isn't signed in, and surfacing that as an error is better than
// crashing the layout.
//
// RLS on `spaces` (via `can_read_space`, migration 0010) ensures this
// query only sees spaces the caller is an active member of, so there's
// no risk of silently resolving to someone else's personal space.
export async function getPersonalSpaceId(
  supabase: SupabaseClient
): Promise<string | null> {
  const { data } = await supabase
    .from("spaces")
    .select("id")
    .eq("type", "personal")
    .limit(1)
    .single();
  return data?.id ?? null;
}
