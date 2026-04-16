import { createClient } from "@/lib/supabase/server";
import InvitationBannerClient from "./InvitationBannerClient";

type RawInvitation = {
  id: string;
  space_id: string;
  spaces: { name: string } | null;
};

// Server component that queries pending invitations matching the
// current user's email. Rendered in the root layout right after
// the Navbar so the banner is visible on every page.
export default async function InvitationBanner() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // No user = no banner (unauthenticated pages like /login).
  if (!user?.email) return null;

  const { data: rawInvitations } = await supabase
    .from("invitations")
    .select("id, space_id, spaces!inner(name)")
    .eq("invited_email", user.email.toLowerCase())
    .eq("status", "pending");

  const invitations = (
    (rawInvitations ?? []) as unknown as RawInvitation[]
  ).map((inv) => ({
    id: inv.id,
    spaceId: inv.space_id,
    spaceName: inv.spaces?.name ?? "Unknown space",
  }));

  return <InvitationBannerClient invitations={invitations} />;
}
