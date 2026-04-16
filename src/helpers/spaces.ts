// Cross-route helpers for looking up space context. Three functions:
// getPersonalSpaceId (perimeter routing), getAggregateSpaceIds
// (shared-space view), and getSpaceAttributions (display names for
// rows from other members' personal spaces).

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

// Returns the list of space IDs to query for a given viewed space.
//
// For a personal space: just [spaceId] — you only see your own data.
// For a shared space: [sharedSpaceId, ...linkedPersonalSpaceIds],
// computed from parent_space_id. This is what makes the shared-space
// monthly view aggregate data from all members.
//
// RLS (can_read_space from 0010) ensures the caller only sees
// personal spaces that are linked to a shared space they're in, so
// the query naturally returns the correct set without any app-layer
// permission checks.
export async function getAggregateSpaceIds(
  supabase: SupabaseClient,
  spaceId: string
): Promise<string[]> {
  const { data: space } = await supabase
    .from("spaces")
    .select("type")
    .eq("id", spaceId)
    .single();

  if (!space || space.type === "personal") return [spaceId];

  // Shared space: include itself + every personal space linked to it.
  const { data: children } = await supabase
    .from("spaces")
    .select("id")
    .eq("parent_space_id", spaceId);

  return [spaceId, ...(children ?? []).map((c) => c.id)];
}

// Map of spaceId → owner display name, for attributing entries in
// the shared-space aggregate view. Example output:
//   { "abc": "João", "def": "Maria", "ghi": "Joint" }
//
// Personal spaces are labeled with the owner's full_name from
// auth.users metadata. The shared space itself is labeled "Joint"
// since entries there aren't attributed to any specific member.
export async function getSpaceAttributions(
  supabase: SupabaseClient,
  spaceIds: string[]
): Promise<Record<string, string>> {
  const { data: spaces } = await supabase
    .from("spaces")
    .select("id, name, type, created_by")
    .in("id", spaceIds);

  if (!spaces) return {};

  const result: Record<string, string> = {};
  for (const s of spaces) {
    if (s.type === "shared") {
      result[s.id] = "Joint";
    } else {
      // Personal space — use the space name which is the owner's
      // Google display name (set by the on_auth_user_created trigger).
      result[s.id] = s.name;
    }
  }
  return result;
}
