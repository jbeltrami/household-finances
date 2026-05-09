import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { performReportGeneration } from "@/helpers/reports";
import { performMonthlyReportSend } from "@/lib/email/send-monthly-report";
import { addMonthsYm, currentYearMonth } from "@/helpers/date";

// Vercel Cron entry point — fires at 11:00 UTC on the 1st of each
// month (08:00 São Paulo). Generates and emails the previous month's
// report for every opted-in personal space. Idempotent: a retry
// safely skips already-sent spaces.
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const prevYm = addMonthsYm(currentYearMonth(), -1);
  const [year, month] = prevYm.split("-").map(Number);

  const admin = createAdminClient();

  // Personal spaces minus opted-out ones (absence of a settings row
  // = enabled, so we only need to exclude rows where enabled=false).
  const { data: allSpaces, error: spacesError } = await admin
    .from("spaces")
    .select("id")
    .eq("type", "personal");
  if (spacesError) {
    return Response.json(
      { error: `Failed to list spaces: ${spacesError.message}` },
      { status: 500 }
    );
  }

  const { data: optedOut } = await admin
    .from("monthly_report_settings")
    .select("space_id")
    .eq("enabled", false);

  const optedOutSet = new Set(
    (optedOut ?? []).map((r) => r.space_id as string)
  );
  const optInSpaces = (allSpaces ?? []).filter((s) => !optedOutSet.has(s.id));

  const host = request.headers.get("host");
  if (!host) {
    return Response.json(
      { error: "Missing host header" },
      { status: 400 }
    );
  }
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const baseUrl = `${proto}://${host}`;

  let generated = 0;
  let sent = 0;
  let alreadySent = 0;
  let empty = 0;
  let failed = 0;

  for (const space of optInSpaces) {
    try {
      // Idempotency: skip if a sent_at exists for this (space, month).
      const { data: existing } = await admin
        .from("monthly_reports")
        .select("id, sent_at")
        .eq("space_id", space.id)
        .eq("year", year)
        .eq("month", month)
        .maybeSingle();

      if (existing?.sent_at) {
        alreadySent += 1;
        continue;
      }

      let reportId = existing?.id as string | undefined;

      if (!reportId) {
        const result = await performReportGeneration(
          admin,
          admin,
          space.id,
          year,
          month
        );
        if (!result.generated) {
          empty += 1;
          continue;
        }
        const { data: row } = await admin
          .from("monthly_reports")
          .select("id")
          .eq("space_id", space.id)
          .eq("year", year)
          .eq("month", month)
          .single();
        if (!row) {
          failed += 1;
          continue;
        }
        reportId = row.id as string;
        generated += 1;
      }

      await performMonthlyReportSend(admin, reportId, baseUrl);
      sent += 1;
    } catch (e) {
      console.error(`Cron failed for space ${space.id}:`, e);
      failed += 1;
    }
  }

  return Response.json({
    runFor: prevYm,
    spaces: optInSpaces.length,
    generated,
    sent,
    alreadySent,
    empty,
    failed,
  });
}
