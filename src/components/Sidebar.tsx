import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getPersonalSpaceId } from "@/helpers/spaces";
import SidebarNav from "./SidebarNav";

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .slice(0, 2)
    .join("");
}

export default async function Sidebar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Proxy redirects unauthenticated users to /login before any page
  // renders, so we don't show the sidebar at all if absent.
  if (!user) return null;

  const spaceId = await getPersonalSpaceId(supabase);
  if (!spaceId) return null;

  const fullName = user.user_metadata?.full_name as string | undefined;
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const displayName = fullName ?? user.email ?? "Usuário";
  const initials = getInitials(displayName);

  // Read the collapse preference here on the server so the initial
  // render matches the user's saved state — no expand-to-collapse
  // flash on every page load.
  const cookieStore = await cookies();
  const defaultCollapsed = cookieStore.get("sidebar_collapsed")?.value === "1";

  return (
    <SidebarNav
      displayName={displayName}
      avatarUrl={avatarUrl}
      initials={initials}
      defaultCollapsed={defaultCollapsed}
    />
  );
}
