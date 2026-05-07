import { createClient } from "@supabase/supabase-js";

// Bypasses RLS. Server-only. Use only after validating the request with the
// user-session client; never expose this client's results directly to a user.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
