import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  todayYmd,
  parseYearMonthFromYmd,
  formatDateYmd,
} from "@/helpers/date";
import { brlFormatter, dateFormatter } from "@/helpers/format";
import { getEntriesForMonth } from "@/helpers/ledger";
import { sendWhatsAppText } from "@/lib/whatsapp/client";

// Vercel Cron entry point — fires at 11:00 UTC daily (08:00 São
// Paulo). For every opted-in personal space, finds bills that
// became overdue this month (date <= yesterday, paid=false) and
// haven't already been notified, sends a digest message, then
// logs each bill so the next run skips it. Idempotent.
//
// Scope rules (decided in chat):
//   - Daily digest, not per-bill spam (one message lists all new
//     overdue bills for the day).
//   - Stop at month boundary: bills whose date falls in a now-
//     locked previous month are out of scope. The range filter
//     [start_of_current_month, yesterday] enforces this.
//   - Skipped bills are out of scope (getEntriesForMonth already
//     filters them).
//   - Recurring virtual occurrences are in scope; they're keyed
//     in the log as (template_id, occurrence_date) instead of
//     entry_id.
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const today = todayYmd();
  const parts = parseYearMonthFromYmd(today);
  if (!parts) {
    return Response.json(
      { error: `Could not parse today's date: ${today}` },
      { status: 500 }
    );
  }
  const { year, month, day } = parts;

  // If today is the 1st, "yesterday" lives in the now-locked
  // previous month and falls out of scope by our policy. Bail
  // early — saves all the per-space work.
  if (day === 1) {
    return Response.json({
      runDate: today,
      note: "Skipped: month-boundary day, no current-month range to check.",
      spaces: 0,
      candidates: 0,
      sent: 0,
      empty: 0,
      failed: 0,
    });
  }

  const monthStart = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01`;

  // yesterday = today - 1, computed in local-date space (matches
  // how Postgres `date` values come back as YYYY-MM-DD strings).
  const todayDate = new Date(year, month - 1, day);
  todayDate.setDate(todayDate.getDate() - 1);
  const yesterday = formatDateYmd(todayDate);

  const admin = createAdminClient();

  const { data: settings, error: settingsErr } = await admin
    .from("whatsapp_notification_settings")
    .select("space_id, phone_e164")
    .eq("enabled", true)
    .not("phone_e164", "is", null);

  if (settingsErr) {
    return Response.json(
      { error: `Failed to list settings: ${settingsErr.message}` },
      { status: 500 }
    );
  }

  let candidates = 0;
  let sent = 0;
  let empty = 0;
  let failed = 0;

  for (const setting of settings ?? []) {
    const spaceId = setting.space_id as string;
    const phone = setting.phone_e164 as string;

    try {
      // All entries (materialized + virtual recurring) for the
      // current month, for this space. Skipped rows already
      // filtered out by the helper.
      const allEntries = await getEntriesForMonth(
        admin,
        [spaceId],
        year,
        month
      );

      // In-scope = past-due AND unpaid AND a recurring bill (or
      // an exception/override of one). One-off entries
      // (template_id IS NULL) are expenses — historical records,
      // not obligations with a due date — so they're never
      // "overdue" in the alert sense even if marked unpaid.
      const overdue = allEntries.filter(
        (e) => e.date <= yesterday && !e.paid && e.template_id !== null
      );

      if (overdue.length === 0) {
        empty += 1;
        continue;
      }

      // Sent log for this space, scoped to the current-month
      // window so we only fetch what could possibly match.
      const { data: sentLogs } = await admin
        .from("whatsapp_notifications_sent")
        .select("entry_id, template_id, occurrence_date")
        .eq("space_id", spaceId)
        .gte("occurrence_date", monthStart)
        .lte("occurrence_date", yesterday);

      const sentEntryIds = new Set(
        (sentLogs ?? [])
          .filter((r) => r.entry_id !== null)
          .map((r) => r.entry_id as string)
      );
      const sentTemplateKeys = new Set(
        (sentLogs ?? [])
          .filter((r) => r.template_id !== null)
          .map((r) => `${r.template_id as string}|${r.occurrence_date as string}`)
      );

      // Subtract anything already notified about. Note: a
      // materialized entry that USED to be a virtual occurrence
      // we already notified about (user materialized it after we
      // logged the (template, date) row) gets caught by the
      // template-key check below — so we don't double-notify.
      const newOverdue = overdue.filter((e) => {
        if (e.id !== null) {
          if (sentEntryIds.has(e.id)) return false;
          if (
            e.template_id &&
            sentTemplateKeys.has(`${e.template_id}|${e.date}`)
          ) {
            return false;
          }
          return true;
        }
        // Virtual recurring occurrence (id === null).
        if (!e.template_id) return false;
        return !sentTemplateKeys.has(`${e.template_id}|${e.date}`);
      });

      if (newOverdue.length === 0) {
        empty += 1;
        continue;
      }

      candidates += newOverdue.length;

      // Build the digest message in pt-BR.
      const lines = newOverdue.map((e) => {
        const dateStr = dateFormatter.format(new Date(`${e.date}T00:00:00Z`));
        const amountStr = brlFormatter.format(e.amount);
        return `• ${e.name} — ${amountStr} (venc. ${dateStr})`;
      });
      const total = newOverdue.reduce((sum, e) => sum + e.amount, 0);
      const totalStr = brlFormatter.format(total);

      const body =
        `Home Finances: ${newOverdue.length} conta(s) vencida(s) ainda em aberto.\n` +
        lines.join("\n") +
        `\n\nTotal: ${totalStr}`;

      await sendWhatsAppText(phone, body);

      // Log each notified bill. Materialized rows key by entry_id;
      // virtual occurrences key by (template_id, occurrence_date).
      // The CHECK on the table enforces exactly-one-of.
      const logRows = newOverdue.map((e) => ({
        space_id: spaceId,
        entry_id: e.id,
        template_id: e.id === null ? e.template_id : null,
        occurrence_date: e.date,
      }));

      const { error: logErr } = await admin
        .from("whatsapp_notifications_sent")
        .insert(logRows);

      if (logErr) {
        // The message already went out. Logging failure is bad
        // (we'll re-send tomorrow) but not worse than aborting
        // the whole run. Surface it in the failure count.
        console.error(
          `WhatsApp log insert failed for space ${spaceId}:`,
          logErr
        );
        failed += 1;
        continue;
      }

      sent += 1;
    } catch (e) {
      console.error(`WhatsApp cron failed for space ${spaceId}:`, e);
      failed += 1;
    }
  }

  return Response.json({
    runDate: today,
    spaces: settings?.length ?? 0,
    candidates,
    sent,
    empty,
    failed,
  });
}
