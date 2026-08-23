import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPersonalSpaceId } from "@/helpers/spaces";
import { monthUrl, settingsCategoriesUrl } from "@/helpers/paths";
import Card from "@/components/Card";
import { Tags, ChevronRight } from "lucide-react";
import RenameSpaceForm from "./_components/RenameSpaceForm";
import MonthlyReportEmailToggle from "./_components/MonthlyReportEmailToggle";
import OverdueAlertToggle from "./_components/OverdueAlertToggle";

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
    .from("notification_settings")
    .select("monthly_report_enabled, overdue_alert_enabled")
    .eq("space_id", spaceId)
    .maybeSingle();

  const emailEnabled = settings?.monthly_report_enabled ?? true;
  const alertEnabled = settings?.overdue_alert_enabled ?? true;
  // When the last Aviso actually went out, read from the send log rather than
  // from a timestamp beside the settings: one fact, one home. Row-level
  // security already scopes email_sends to this space, so the session client
  // is the right one and the admin client would be reaching past a boundary
  // that is doing its job.
  const { data: lastAlert } = await supabase
    .from("email_sends")
    .select("sent_at")
    .eq("space_id", spaceId)
    .eq("kind", "overdue_alert")
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastAlertSentAt = lastAlert?.sent_at ?? null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8">
      <Link href={backHref} className="text-sm text-muted hover:text-fg">
        ← Voltar para este mês
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-fg">Configurações</h1>

      <div className="mt-6 flex flex-col gap-5">
        <RenameSpaceForm currentName={space.name} />

        <Card className="p-0">
          <Link
            href={settingsCategoriesUrl()}
            className="flex items-center gap-3 px-5 py-4"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-fg">
              <Tags className="h-5 w-5" strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-medium text-fg">
                Categorias
              </span>
              <span className="block text-xs text-muted">
                Gerencie como suas receitas e saídas são agrupadas
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted" strokeWidth={2} />
          </Link>
        </Card>
        <MonthlyReportEmailToggle initialEnabled={emailEnabled} />
        <OverdueAlertToggle
          initialEnabled={alertEnabled}
          lastSentAt={lastAlertSentAt}
        />
      </div>
    </div>
  );
}
