import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPersonalSpaceId } from "@/helpers/spaces";
import { monthUrl } from "@/helpers/paths";
import RenameSpaceForm from "./_components/RenameSpaceForm";
import MonthlyReportEmailToggle from "./_components/MonthlyReportEmailToggle";
import WhatsAppNotificationToggle from "./_components/WhatsAppNotificationToggle";

export default async function SpaceSettingsPage() {
  const supabase = await createClient();

  const spaceId = await getPersonalSpaceId(supabase);
  if (!spaceId) notFound();

  const { data: space } = await supabase
    .from("spaces")
    .select("id, name, created_by")
    .eq("id", spaceId)
    .single();

  if (!space) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || space.created_by !== user.id) notFound();

  const now = new Date();
  const backHref = monthUrl(now.getFullYear(), now.getMonth() + 1);

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
        ← Voltar para este mês
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Configurações
      </h1>

      <section className="mt-6">
        <RenameSpaceForm spaceId={spaceId} currentName={space.name} />
      </section>

      <section className="mt-8">
        <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">
          Relatórios por e-mail
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
          Notificações por WhatsApp
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
