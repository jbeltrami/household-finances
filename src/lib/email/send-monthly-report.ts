import type { SupabaseClient } from "@supabase/supabase-js";
import { spaceReportsUrl, spaceSettingsUrl } from "@/helpers/paths";
import { formatMonthLabel } from "@/helpers/date";
import { getFromAddress, getTransport } from "./transport";
import { renderMonthlyReportEmail } from "./MonthlyReportEmail";

// Send (or re-send) a generated monthly report by email. Reused by
// the manual server action and the Piece C cron handler.
//
// IMPORTANT: this function bypasses RLS via the admin client. The
// caller is responsible for verifying that this report should be
// sent (ownership, opt-in, idempotency). The cron handler does this
// before calling; the manual action does an RLS-gated lookup first.
export async function performMonthlyReportSend(
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
    .select("type, created_by")
    .eq("id", report.space_id)
    .single();
  if (!space) throw new Error("Space not found");
  if (space.type !== "personal") {
    throw new Error("Only personal-space reports can be emailed");
  }

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

  const dashboardUrl = `${baseUrl}${spaceReportsUrl(report.space_id)}`;
  const settingsUrl = `${baseUrl}${spaceSettingsUrl(report.space_id)}`;
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
    settingsUrl,
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
