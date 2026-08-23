import type { SupabaseClient } from "@supabase/supabase-js";

// The record of mail this app has sent.
//
// Writing lives here rather than in each sender so there is one place that
// knows the shape of the row, and so the two senders cannot drift on when a
// send counts as having happened.
//
// See supabase/migrations/0015_email_sends.sql for what this table is for —
// and, more importantly, what it must never be used for.

export type EmailKind = "overdue_alert" | "monthly_report";

// Record a send that has already succeeded.
//
// Called after the transport has accepted the message, so a send that threw
// leaves no row. Takes the admin client because the table has no write policy:
// a browser must not be able to forge a row (a denial of service once the rate
// limit reads this) or delete one (lifting the limit).
//
// Does not throw. The mail is already gone by the time this runs, and turning
// a bookkeeping failure into a thrown error would tell the caller the send
// failed — inviting a retry that sends the same message twice. A failure here
// costs one row of audit history and one unit of rate-limit budget, which is
// the cheaper wrong answer.
export async function recordEmailSend(
  admin: SupabaseClient,
  spaceId: string,
  kind: EmailKind
): Promise<void> {
  const { error } = await admin
    .from("email_sends")
    .insert({ space_id: spaceId, kind });

  if (error) {
    console.error(
      `email_sends insert failed for space ${spaceId} (${kind}):`,
      error
    );
  }
}

// Every send recorded for this space since a moment, newest first.
//
// Both kinds, deliberately: the manual allowance is one shared budget, because
// what it protects is the mail account rather than either feature.
export async function sendTimesSince(
  admin: SupabaseClient,
  spaceId: string,
  since: Date
): Promise<Date[]> {
  const { data, error } = await admin
    .from("email_sends")
    .select("sent_at")
    .eq("space_id", spaceId)
    .gte("sent_at", since.toISOString())
    .order("sent_at", { ascending: false });

  // Fail closed. An unread count is an empty count, which reads as "nothing
  // sent yet" and lifts the limit exactly when the database is unhappy.
  if (error) throw new Error(`Failed to read send history: ${error.message}`);

  return (data ?? []).map((r) => new Date(r.sent_at as string));
}
