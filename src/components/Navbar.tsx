import { createClient } from "@/lib/supabase/server";
import NavbarNav from "./NavbarNav";

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .slice(0, 2)
    .join("");
}

export default async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The proxy redirects unauthenticated users to /login before any
  // page renders, so we don't render the navbar at all if absent.
  if (!user) return null;

  // The user has exactly one personal space (created by the
  // on_auth_user_created trigger at signup).
  const { data: space } = await supabase
    .from("spaces")
    .select("id, name")
    .eq("created_by", user.id)
    .single();

  if (!space) return null;

  const fullName = user.user_metadata?.full_name as string | undefined;
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const displayName = fullName ?? user.email ?? "User";
  const initials = getInitials(displayName);

  return (
    <NavbarNav
      spaceId={space.id}
      spaceName={space.name}
      avatarUrl={avatarUrl}
      initials={initials}
    />
  );
}
