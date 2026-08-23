import type { SupabaseClient } from "@supabase/supabase-js";
import { buildAvisoLedger } from "@/helpers/aviso";
import { parseYearMonthFromYmd, previousYmd } from "@/helpers/date";
import { buildMonthItems, getFinancingLedger } from "@/helpers/financing";
import { getEntriesForMonth } from "@/helpers/ledger";
import { summarizeOverdue } from "@/helpers/month-summary";
import { monthUrl, settingsUrl } from "@/helpers/paths";
import { avisoSubject, renderOverdueAvisoEmail } from "./OverdueAvisoEmail";
import { getFromAddress, getTransport } from "./transport";

export type AvisoSendResult =
  | { sent: true; count: number; total: number }
  | { sent: false; reason: "nothing-vencida" };

// Send one space's daily Aviso.
//
// Stateless by design: this reads what is Vencida right now and sends if the
// list is non-empty. It does not know or ask what it said yesterday, so an
// Obrigação left unpaid is mailed about again tomorrow. That repetition is
// the decision, not an oversight — see
// docs/adr/0002-avisos-are-stateless-and-repeat-daily.md before adding any
// form of deduplication.
//
// IMPORTANT: bypasses RLS via the admin client. The caller is responsible for
// establishing that this space should be mailed at all — the cron filters on
// the opt-out flag before calling, and the manual action resolves the space
// from the session.
export async function performOverdueAvisoSend(
  admin: SupabaseClient,
  spaceId: string,
  baseUrl: string,
  today: string
): Promise<AvisoSendResult> {
  const parts = parseYearMonthFromYmd(today);
  if (!parts) throw new Error(`Could not parse today's date: ${today}`);
  const { year, month } = parts;

  // Yesterday, not today: a Conta due today still has the whole day to be
  // paid, and an email at 08:00 calling it late would be wrong. On the 1st
  // this lands in the month that just locked, which correctly yields nothing.
  const cutoff = previousYmd(today);

  // Only the current month. Past months are locked, so an Obrigação in one
  // is not something the user can act on from the link this email carries.
  const [entries, financing] = await Promise.all([
    getEntriesForMonth(admin, [spaceId], year, month),
    getFinancingLedger(admin, spaceId),
  ]);
  const parcelas = buildMonthItems(financing, year, month).bills;

  const { rows, count, total } = summarizeOverdue(
    buildAvisoLedger(entries, parcelas, cutoff)
  );

  if (count === 0) return { sent: false, reason: "nothing-vencida" };

  const { data: space } = await admin
    .from("spaces")
    .select("created_by")
    .eq("id", spaceId)
    .single();
  if (!space) throw new Error("Space not found");

  const { data: userResp, error: userErr } =
    await admin.auth.admin.getUserById(space.created_by);
  if (userErr || !userResp?.user) {
    throw new Error(`Failed to look up user: ${userErr?.message ?? "no user"}`);
  }

  const userEmail = userResp.user.email;
  if (!userEmail) throw new Error("User has no email address");
  const fullName = userResp.user.user_metadata?.full_name as string | undefined;
  const userName = fullName ?? userEmail.split("@")[0];

  const { html, text } = await renderOverdueAvisoEmail({
    userName,
    rows,
    total,
    monthUrl: `${baseUrl}${monthUrl(year, month)}`,
    settingsUrl: `${baseUrl}${settingsUrl()}`,
  });

  const transport = getTransport();
  await transport.sendMail({
    from: getFromAddress(),
    to: userEmail,
    subject: avisoSubject(count),
    html,
    text,
  });

  // A receipt, written only after the send succeeded. Configurações shows it
  // so that silence can be told apart from breakage; nothing above reads it.
  // A failed send therefore leaves it untouched and tomorrow simply tries
  // again, which is the whole retry story.
  await admin
    .from("notification_settings")
    .upsert(
      { space_id: spaceId, last_aviso_sent_at: new Date().toISOString() },
      { onConflict: "space_id" }
    );

  return { sent: true, count, total };
}
