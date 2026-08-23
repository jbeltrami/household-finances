import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/helpers/session";
import { recordEmailSend } from "@/helpers/email-log";
import { reportsUrl, settingsUrl } from "@/helpers/paths";
import { formatMonthLabel } from "@/helpers/date";
import { getFromAddress, getTransport } from "./transport";
import { renderMonthlyReportEmail } from "./MonthlyReportEmail";

// Send (or re-send) a generated monthly report by email, for a report the
// caller names.
//
// CRON-SCOPED. It bypasses RLS via the admin client and cannot check that the
// caller was entitled to this report, so the caller must have established that
// already. The cron has, by authenticating with its Bearer token and acting for
// every space by design. A browser-reachable path should call
// sendMonthlyReportForCurrentUser below, which establishes it for you.
export async function sendMonthlyReportForId(
  admin: SupabaseClient,
  reportId: string,
  baseUrl: string
): Promise<void> {
  const { data: report } = await admin
    .from("monthly_reports")
    .select("id, space_id, year, month, storage_path")
    .eq("id", reportId)
    .single();
  if (!report) throw new Error("Report not found");

  const { data: space } = await admin
    .from("spaces")
    .select("created_by")
    .eq("id", report.space_id)
    .single();
  if (!space) throw new Error("Space not found");

  // Look up the owner via Supabase's admin auth API so we can fetch
  // email + display name without a user session.
  const { data: userResp, error: userErr } =
    await admin.auth.admin.getUserById(space.created_by);
  if (userErr || !userResp?.user) {
    throw new Error(
      `Failed to look up user: ${userErr?.message ?? "no user"}`
    );
  }

  const userEmail = userResp.user.email;
  if (!userEmail) throw new Error("User has no email address");
  const fullName = userResp.user.user_metadata?.full_name as string | undefined;
  const userName = fullName ?? userEmail.split("@")[0];

  const dashboardUrl = `${baseUrl}${reportsUrl()}`;
  const settingsLinkUrl = `${baseUrl}${settingsUrl()}`;
  const monthLabel = capitalize(formatMonthLabel(report.year, report.month));

  const { data: pdfBlob, error: dlError } = await admin.storage
    .from("monthly-reports")
    .download(report.storage_path);
  if (dlError || !pdfBlob) {
    throw new Error(`Failed to fetch PDF: ${dlError?.message ?? "unknown"}`);
  }
  const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());

  const { html, text } = await renderMonthlyReportEmail({
    userName,
    monthLabel,
    dashboardUrl,
    settingsUrl: settingsLinkUrl,
  });

  const transport = getTransport();
  await transport.sendMail({
    from: getFromAddress(),
    to: userEmail,
    subject: `Seu relatório de ${monthLabel}`,
    html,
    text,
    attachments: [
      {
        filename: `relatorio-${report.year}-${String(report.month).padStart(2, "0")}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });

  await recordEmailSend(admin, report.space_id, "monthly_report");

  const { error: updateError } = await admin
    .from("monthly_reports")
    .update({ sent_at: new Date().toISOString() })
    .eq("id", reportId);
  if (updateError) {
    throw new Error(`Failed to record sent_at: ${updateError.message}`);
  }
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

// Send a report the signed-in user owns.
//
// SESSION-SCOPED. Unlike the Aviso, the id here is legitimately the user's
// choice — they pick which month to re-send — so it cannot be removed from the
// signature. What can be removed is the chance to forget the check: the
// ownership proof lives in this function rather than in each caller, so a new
// caller inherits it instead of having to remember it.
//
// Two steps, in this order: the user-session client looks the report up, so RLS
// decides whether it is visible at all, and only then is ownership confirmed
// against the space. See docs/adr/0003-the-database-is-the-security-boundary.md.
export async function sendMonthlyReportForCurrentUser(
  reportId: string,
  baseUrl: string
): Promise<void> {
  const supabase = await createClient();
  const { userId } = await requireSession(supabase);

  const { data: report } = await supabase
    .from("monthly_reports")
    .select("id, space_id")
    .eq("id", reportId)
    .single();
  if (!report) throw new Error("Relatório não encontrado");

  const { data: space } = await supabase
    .from("spaces")
    .select("created_by")
    .eq("id", report.space_id)
    .single();
  if (!space) throw new Error("Espaço não encontrado");
  if (space.created_by !== userId) {
    throw new Error("Apenas o dono do espaço pode enviar relatórios");
  }

  await sendMonthlyReportForId(createAdminClient(), reportId, baseUrl);
}
