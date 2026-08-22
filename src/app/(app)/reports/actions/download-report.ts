"use server";

import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/helpers/session";
import { createAdminClient } from "@/lib/supabase/admin";

const SIGNED_URL_TTL_SECONDS = 300;

// Mint a short-lived signed URL for the report PDF and return it.
// The client navigates via window.location.href so the browser
// handles the attachment-disposition response naturally. The user-
// session SELECT enforces access — only members of the report's
// space can resolve the row. The admin client mints the URL because
// the bucket is private with deny-all storage policies.
export async function downloadReport(reportId: string): Promise<string> {
  const supabase = await createClient();
  await requireSession(supabase);

  const { data: report } = await supabase
    .from("monthly_reports")
    .select("storage_path, year, month")
    .eq("id", reportId)
    .single();

  if (!report) throw new Error("Relatório não encontrado");

  const filename = `relatorio-${report.year}-${String(report.month).padStart(2, "0")}.pdf`;

  const admin = createAdminClient();
  const { data: signed, error } = await admin.storage
    .from("monthly-reports")
    .createSignedUrl(report.storage_path, SIGNED_URL_TTL_SECONDS, {
      download: filename,
    });

  if (error || !signed) {
    throw new Error(
      `Failed to create download link: ${error?.message ?? "unknown"}`
    );
  }

  return signed.signedUrl;
}
