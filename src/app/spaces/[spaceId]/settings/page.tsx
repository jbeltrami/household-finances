import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { spaceMonthUrl } from "@/helpers/paths";
import RenameSpaceForm from "./_components/RenameSpaceForm";
import InviteMemberForm from "./_components/InviteMemberForm";
import MemberList from "./_components/MemberList";
import PendingInvitations from "./_components/PendingInvitations";
import MonthlyReportEmailToggle from "./_components/MonthlyReportEmailToggle";
import WhatsAppNotificationToggle from "./_components/WhatsAppNotificationToggle";

type MemberRow = {
  user_id: string;
  role: string;
  users: { raw_user_meta_data: Record<string, unknown> } | null;
};

export default async function SpaceSettingsPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  const supabase = await createClient();

  const { data: space } = await supabase
    .from("spaces")
    .select("id, name, type, created_by")
    .eq("id", spaceId)
    .single();

  if (!space) notFound();

  const now = new Date();
  const backHref = spaceMonthUrl(spaceId, now.getFullYear(), now.getMonth() + 1);

  if (space.type === "personal") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || space.created_by !== user.id) notFound();

    // Absence of a row = enabled (default-on behavior). The toggle
    // creates the row on first interaction.
    const { data: settings } = await supabase
      .from("monthly_report_settings")
      .select("enabled")
      .eq("space_id", spaceId)
      .maybeSingle();

    const emailEnabled = settings?.enabled ?? true;

    // WhatsApp settings: row may be absent (never set up). Default
    // is enabled=false, phone=null in that case.
    const { data: whatsappSettings } = await supabase
      .from("whatsapp_notification_settings")
      .select("enabled, phone_e164")
      .eq("space_id", spaceId)
      .maybeSingle();

    const whatsappEnabled = whatsappSettings?.enabled ?? false;
    const whatsappPhone = whatsappSettings?.phone_e164 ?? null;

    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href={backHref}
          className="text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ← Back to this month
        </Link>

        <h1 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Space settings
        </h1>

        <section className="mt-6">
          <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">
            Email reports
          </h2>
          <div className="mt-3 rounded-md border border-gray-200 p-4 dark:border-gray-800">
            <MonthlyReportEmailToggle
              spaceId={spaceId}
              initialEnabled={emailEnabled}
            />
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">
            WhatsApp notifications
          </h2>
          <div className="mt-3 rounded-md border border-gray-200 p-4 dark:border-gray-800">
            <WhatsAppNotificationToggle
              spaceId={spaceId}
              initialPhone={whatsappPhone}
              initialEnabled={whatsappEnabled}
            />
          </div>
        </section>
      </div>
    );
  }

  // --- Shared space settings ---------------------------------------

  const { data: rawMembers } = await supabase
    .from("space_members")
    .select("user_id, role, users:user_id(raw_user_meta_data)")
    .eq("space_id", spaceId)
    .is("left_at", null);

  const members = ((rawMembers ?? []) as unknown as MemberRow[]).map((m) => ({
    userId: m.user_id,
    displayName:
      (m.users?.raw_user_meta_data?.full_name as string) ?? "Unknown",
    role: m.role,
  }));

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
        href={backHref}
        className="text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
      >
        ← Back to this month
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Space settings
      </h1>

      <section className="mt-6">
        <RenameSpaceForm spaceId={spaceId} currentName={space.name} />
      </section>

      <section className="mt-8">
        <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">
          Members
        </h2>
        <div className="mt-3">
          <MemberList members={members} />
        </div>
      </section>

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
