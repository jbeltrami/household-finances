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
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8">
      <Link href={backHref} className="text-sm text-muted hover:text-fg">
        ← Voltar para este mês
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-fg">Configurações</h1>

      <div className="mt-6 flex flex-col gap-5">
        <RenameSpaceForm currentName={space.name} />
        <MonthlyReportEmailToggle initialEnabled={emailEnabled} />
        <WhatsAppNotificationToggle
          initialPhone={whatsappPhone}
          initialEnabled={whatsappEnabled}
        />
      </div>
    </div>
  );
}
