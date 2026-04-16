import { createClient } from "@/lib/supabase/server";
import NavbarNav, { type NavbarSpace } from "./NavbarNav";

type MembershipRow = {
  spaces: {
    id: string;
    name: string;
    type: "personal" | "shared";
  };
};

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

  // The middleware redirects unauthenticated users to /login before any page
  // renders, so if there's no user we don't render the navbar at all.
  if (!user) return null;

  // Every space the user is an *active* direct member of (left_at IS NULL).
  // We query through space_members rather than spaces directly because the
  // can_read_space RLS policy also returns linked personal spaces for
  // shared-space members — those belong to other users and should not
  // appear in the switcher.
  const { data: rawMemberships } = await supabase
    .from("space_members")
    .select("spaces!inner(id, name, type)")
    .eq("user_id", user.id)
    .is("left_at", null);

  const memberships = (rawMemberships ?? []) as unknown as MembershipRow[];

  // Personal space first (it's your "home" context), shared spaces after
  // sorted alphabetically. The server sort means the dropdown order is
  // stable across renders without any client-side work.
  const spaces: NavbarSpace[] = memberships
    .map((m) => ({
      id: m.spaces.id,
      name: m.spaces.name,
      type: m.spaces.type,
    }))
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "personal" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  const fullName = user.user_metadata?.full_name as string | undefined;
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const displayName = fullName ?? user.email ?? "User";
  const initials = getInitials(displayName);

  return (
    <NavbarNav
      spaces={spaces}
      avatarUrl={avatarUrl}
      initials={initials}
    />
  );
}
