// Who is calling, and which space is theirs.
//
// Every server action opened by asking those two questions separately — one
// call to validate the session, another to find the space — and each wrote
// its own Portuguese refusal, in four different result shapes. They are
// always wanted together and either half was separately forgettable.
//
// One lookup answers both. A `spaces` row is only visible to the user who
// owns it (`is_active_member` collapses to `auth.uid() = spaces.created_by`),
// so a row coming back is proof the request carried a valid session, and the
// `created_by` on it is that user. Failing to find one covers both "not
// signed in" and "no space", which are the same refusal from the caller's
// side.
//
// That the row is proof matters beyond tidiness: several actions go on to
// use the admin client, which bypasses RLS entirely, and this check is what
// stands in front of them. The admin client bypasses RLS entirely, so it is
// only safe once a user-session client has established ownership.

import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Session = { userId: string; spaceId: string };

export type SessionResult =
  | { ok: false; error: string }
  | ({ ok: true } & Session);

const NOT_AUTHENTICATED = "Não autenticado";

// Wrapped in React.cache so several callers in one request — the page, the
// navbar, an action — share a single round trip, the way the space lookup it
// replaces already did.
const lookup = cache(async (supabase: SupabaseClient): Promise<Session | null> => {
  const { data } = await supabase
    .from("spaces")
    .select("id, created_by")
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return { userId: data.created_by as string, spaceId: data.id as string };
});

// For actions rendered against a form, which return their error as state so
// it can appear inline. Callers that carry extra fields in their state add
// them to the refusal themselves.
export async function resolveSession(
  supabase: SupabaseClient
): Promise<SessionResult> {
  const session = await lookup(supabase);
  if (!session) return { ok: false, error: NOT_AUTHENTICATED };
  return { ok: true, ...session };
}

// For actions invoked through a transition, which have no state surface to
// render an error against and so throw. Actions reached through useActionState
// return state instead, because a throw there surfaces as an error boundary
// rather than an inline message.
export async function requireSession(
  supabase: SupabaseClient
): Promise<Session> {
  const session = await lookup(supabase);
  if (!session) throw new Error(NOT_AUTHENTICATED);
  return session;
}
