"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/helpers/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { baseUrlFrom, reportsUrl } from "@/helpers/paths";
import { performMonthlyReportSend } from "@/lib/email/send-monthly-report";

// Manual "Send by email" button on the reports page. Validates the
// user owns the personal space (defense-in-depth on top of the
// RLS-gated SELECT), then delegates to performMonthlyReportSend.
// The cron handler in /api/cron/monthly-reports calls the same
// orchestrator without going through this action.
export async function sendMonthlyReportEmail(reportId: string) {
  const supabase = await createClient();
  const { userId } = await requireSession(supabase);

  // RLS-gated lookup confirms the user has access to this report.
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

  // Derive absolute URLs from the inbound request's host header.
  const headersList = await headers();
  const baseUrl = baseUrlFrom(
    headersList.get("host"),
    headersList.get("x-forwarded-proto")
  );
  if (!baseUrl) throw new Error("Cabeçalho host ausente");

  const admin = createAdminClient();
  await performMonthlyReportSend(admin, reportId, baseUrl);

  revalidatePath(reportsUrl());
}
