import type { SupabaseClient } from "@supabase/supabase-js";
import { sendTimesSince } from "./email-log";

// How much mail a person may send by hand.
//
// Pure: timestamps in, a verdict out. No database and no clock, so every
// boundary below is a one-line assertion rather than something you can only
// find by clicking a button four times and waiting an hour.

// Three, sized for the setup loop: send a test, change a setting, send again,
// check the formatting, send once more. Two locks the user out mid-task — and
// being locked out of the button that proves the feature works is how the
// feature gets switched off instead. Past about five it stops bounding
// anything worth bounding.
export const MANUAL_SEND_LIMIT = 3;

export const WINDOW_MS = 60 * 60 * 1000;

export type RateLimitVerdict =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAt: Date };

// A rolling window rather than a clock hour: counting per clock hour would let
// three sends at 10:59 and three at 11:00 arrive as six inside two minutes.
//
// `sentAt` may contain anything — older sends, and sends the cron made, since
// both kinds share one table. Filtering is this function's job.
export function checkSendWindow(
  sentAt: Date[],
  now: Date
): RateLimitVerdict {
  const cutoff = now.getTime() - WINDOW_MS;

  // Strictly greater: a send exactly an hour old has left the window, so a
  // fourth send becomes possible exactly one hour after the first rather than
  // a millisecond later. That is the boundary a user would actually test.
  const inWindow = sentAt
    .map((d) => d.getTime())
    .filter((t) => t > cutoff)
    .sort((a, b) => a - b);

  if (inWindow.length < MANUAL_SEND_LIMIT) {
    return { allowed: true, remaining: MANUAL_SEND_LIMIT - inWindow.length };
  }

  // Which send has to age out before another is allowed? Not the oldest —
  // with more sends in the window than the limit, losing the oldest only drops
  // the count by one and may still leave it at the limit. Enough must leave
  // for the count to fall to limit - 1, and the last of those to go is the one
  // at this index. Naming the wrong moment sends the user back to a refusal.
  const decisive = inWindow[inWindow.length - MANUAL_SEND_LIMIT];

  return { allowed: false, retryAt: new Date(decisive + WINDOW_MS) };
}

// The same time formatting the app uses everywhere: São Paulo, because that is
// where the user reads it, regardless of where the server runs.
const retryFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export function formatRetryAt(at: Date): string {
  return retryFormatter.format(at);
}

// May this space send another email by hand right now?
//
// Only the manual buttons ask. The crons go through the id-scoped senders and
// never reach this: a daily job throttled by a limit meant for a button is a
// bug. They still write to the same table, so their sends appear in the window
// as history — which is why the window arithmetic handles more rows than the
// limit rather than assuming at most three.
export async function manualSendVerdict(
  admin: SupabaseClient,
  spaceId: string,
  now: Date
): Promise<RateLimitVerdict> {
  const since = new Date(now.getTime() - WINDOW_MS);
  return checkSendWindow(await sendTimesSince(admin, spaceId, since), now);
}
