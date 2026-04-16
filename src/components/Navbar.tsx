import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import NavbarNav, { type NavbarSpace } from "./NavbarNav";
import SignOutButton from "./SignOutButton";

type MembershipRow = {
  spaces: {
    id: string;
    name: string;
    type: "personal" | "shared";
  };
};

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
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <nav className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <NavbarNav spaces={spaces} />
        </div>

        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              width={32}
              height={32}
              className="rounded-full"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">
              {initial}
            </div>
          )}
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {displayName}
          </span>
          <SignOutButton />
        </div>
      </div>
    </nav>
  );
}
