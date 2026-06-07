import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

// Returns the currently authenticated user's personal space ID, or
// null if the lookup fails. Every user gets exactly one personal
// space auto-created on first Google login via the
// `on_auth_user_created` trigger, so for an authenticated session
// this should always return a string. We still surface
// `string | null` so callers can handle the edge case defensively —
// a missing row would mean the trigger failed or the user isn't
// signed in, and surfacing that as an error is better than crashing
// the layout. RLS on `spaces` ensures this only sees the caller's
// own row.
//
// Wrapped in React.cache so multiple callers in the same request
// (page server component, sidebar, server actions) share one round
// trip. Dedup is keyed on the supabase argument identity —
// createClient is also cache()-wrapped, so per-request callers
// receive the same client instance.
export const getPersonalSpaceId = cache(async (
  supabase: SupabaseClient
): Promise<string | null> => {
  const { data } = await supabase
    .from("spaces")
    .select("id")
    .limit(1)
    .single();
  return data?.id ?? null;
});

// Throwing variant for server actions. Pages prefer the
// null-returning version so they can `notFound()` cleanly; actions
// already wrap their work in try/catch (or propagate to
// `useTransition`) and want a single readable line at the top.
export async function requirePersonalSpaceId(
  supabase: SupabaseClient
): Promise<string> {
  const spaceId = await getPersonalSpaceId(supabase);
  if (!spaceId) throw new Error("Espaço não encontrado");
  return spaceId;
}
