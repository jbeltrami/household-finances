import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { spaceMonthUrl } from "@/helpers/paths";
import RenameSpaceForm from "./_components/RenameSpaceForm";
import InviteMemberForm from "./_components/InviteMemberForm";
import MemberList from "./_components/MemberList";
import PendingInvitations from "./_components/PendingInvitations";

type MemberRow = {
  user_id: string;
  role: string;
  users: { raw_user_meta_data: Record<string, unknown> } | null;
};

type InvitationRow = {
  id: string;
  invited_email: string;
};

export default async function SpaceSettingsPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  const supabase = await createClient();

  // Fetch the space to verify it exists and is shared. Settings
  // are only available for shared spaces; personal spaces have
  // no meaningful settings surface yet.
  const { data: space } = await supabase
    .from("spaces")
    .select("id, name, type")
    .eq("id", spaceId)
    .single();

  if (!space) notFound();

  if (space.type !== "shared") {
    const now = new Date();
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Settings are only available for shared spaces.
        </p>
        <Link
          href={spaceMonthUrl(spaceId, now.getFullYear(), now.getMonth() + 1)}
          className="mt-2 inline-block text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
        >
          ← Back to this month
        </Link>
      </div>
    );
  }

  // Active members with display names from auth.users metadata.
  // Supabase exposes auth.users via a 1:1 FK on space_members.user_id.
  const { data: rawMembers } = await supabase
    .from("space_members")
    .select("user_id, role, users:user_id(raw_user_meta_data)")
    .eq("space_id", spaceId)
    .is("left_at", null);

  const members = (
    (rawMembers ?? []) as unknown as MemberRow[]
  ).map((m) => ({
    userId: m.user_id,
    displayName:
      (m.users?.raw_user_meta_data?.full_name as string) ?? "Unknown",
    role: m.role,
  }));

  // Pending invitations for this space.
  const { data: rawInvitations } = await supabase
    .from("invitations")
    .select("id, invited_email")
    .eq("space_id", spaceId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const invitations = (rawInvitations ?? []).map((i) => ({
    id: i.id,
    email: i.invited_email,
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href={spaceMonthUrl(
          spaceId,
          new Date().getFullYear(),
          new Date().getMonth() + 1
        )}
        className="text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
      >
        ← Back to this month
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Space settings
      </h1>

      {/* Rename */}
      <section className="mt-6">
        <RenameSpaceForm spaceId={spaceId} currentName={space.name} />
      </section>

      {/* Members */}
      <section className="mt-8">
        <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">
          Members
        </h2>
        <div className="mt-3">
          <MemberList members={members} />
        </div>
      </section>

      {/* Invite */}
      <section className="mt-8">
        <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">
          Invite someone
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Enter their email. If they don&rsquo;t have an account yet, the
          invite will wait for them to sign up with that address.
        </p>
        <div className="mt-3">
          <InviteMemberForm spaceId={spaceId} />
        </div>
      </section>

      {/* Pending invitations */}
      <section className="mt-8">
        <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">
          Pending invitations
        </h2>
        <div className="mt-3">
          <PendingInvitations invitations={invitations} />
        </div>
      </section>
    </div>
  );
}
