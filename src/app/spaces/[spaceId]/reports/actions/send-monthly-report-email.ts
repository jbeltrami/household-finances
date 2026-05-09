"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { spaceReportsUrl } from "@/helpers/paths";
import { performMonthlyReportSend } from "@/lib/email/send-monthly-report";

// Manual "Send by email" button on the reports page. Validates the
// user owns the personal space (defense-in-depth on top of the
// RLS-gated SELECT), then delegates to performMonthlyReportSend.
// The cron handler in /api/cron/monthly-reports calls the same
// orchestrator without going through this action.
export async function sendMonthlyReportEmail(reportId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // RLS-gated lookup confirms the user has access to this report.
  const { data: report } = await supabase
    .from("monthly_reports")
    .select("id, space_id")
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

  // Derive absolute URLs from the inbound request's host header.
  const headersList = await headers();
  const host = headersList.get("host");
  if (!host) throw new Error("Missing host header");
  const proto =
    headersList.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = `${proto}://${host}`;

  const admin = createAdminClient();
  await performMonthlyReportSend(admin, reportId, baseUrl);

  revalidatePath(spaceReportsUrl(report.space_id));
}
