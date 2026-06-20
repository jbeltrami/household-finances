import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

// Authorize a Vercel Cron (or other server-to-server) request by comparing
// its Bearer token to CRON_SECRET.
//
// Fails CLOSED: if CRON_SECRET is unset, no request is authorized — so a
// missing env var can't be bypassed with a literal "Bearer undefined".
// Uses a constant-time comparison to avoid leaking the secret via timing.
export function isAuthorizedCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;

  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
