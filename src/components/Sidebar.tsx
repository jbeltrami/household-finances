import { createClient } from "@/lib/supabase/server";
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

  const { data: space } = await supabase
    .from("spaces")
    .select("id, name")
    .eq("created_by", user.id)
    .single();

  if (!space) return null;

  const fullName = user.user_metadata?.full_name as string | undefined;
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const displayName = fullName ?? user.email ?? "Usuário";
  const initials = getInitials(displayName);

  return (
    <SidebarNav
      displayName={displayName}
      avatarUrl={avatarUrl}
      initials={initials}
    />
  );
}
