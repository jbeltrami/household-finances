"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { spaceReportsUrl, spaceSettingsUrl } from "@/helpers/paths";
import { formatMonthLabel } from "@/helpers/date";
import { getFromAddress, getTransport } from "@/lib/email/transport";
import { renderMonthlyReportEmail } from "@/lib/email/MonthlyReportEmail";

// Send (or re-send) a generated monthly report by email. Used by the
// manual "Send" button in Piece B and by Piece C's cron loop.
//
// The action does NOT check monthly_report_settings — manual send is
// an explicit user intent and should respect that intent regardless of
// the auto-send toggle. The cron loop is responsible for filtering
// out opted-out spaces before calling.
export async function sendMonthlyReportEmail(reportId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: report } = await supabase
    .from("monthly_reports")
    .select("id, space_id, year, month, storage_path")
    .eq("id", reportId)
    .single();
  if (!report) throw new Error("Report not found");

  const { data: space } = await supabase
    .from("spaces")
    .select("type, created_by")
    .eq("id", report.space_id)
    .single();
  if (!space) throw new Error("Space not found");
  if (space.type !== "personal") {
    throw new Error("Only personal-space reports can be emailed");
  }
  if (space.created_by !== user.id) {
    throw new Error("Only the space owner can send reports");
  }

  const userEmail = user.email;
  if (!userEmail) throw new Error("User has no email address");
  const fullName = user.user_metadata?.full_name as string | undefined;
  const userName = fullName ?? userEmail.split("@")[0];

  // Derive absolute URLs from the inbound request's host header so the
  // same code works in dev (localhost:3000) and prod (Vercel domain)
  // without an APP_URL env var.
  const headersList = await headers();
  const host = headersList.get("host");
  if (!host) throw new Error("Missing host header");
  const proto =
    headersList.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = `${proto}://${host}`;

  const dashboardUrl = `${baseUrl}${spaceReportsUrl(report.space_id)}`;
  const settingsUrl = `${baseUrl}${spaceSettingsUrl(report.space_id)}`;

  const monthLabel = capitalize(formatMonthLabel(report.year, report.month));

  // Download the PDF from storage as a Buffer to attach. We reuse the
  // already-generated artifact rather than re-rendering — keeps the
  // attached PDF identical to what the user sees on the dashboard.
  const admin = createAdminClient();
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

  revalidatePath(spaceReportsUrl(report.space_id));
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}
