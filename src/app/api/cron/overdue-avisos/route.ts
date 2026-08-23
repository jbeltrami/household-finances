import { NextRequest } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { performOverdueAvisoSend } from "@/lib/email/send-overdue-aviso";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayYmd } from "@/helpers/date";

// Vercel Cron entry point — fires at 11:00 UTC daily (08:00 São Paulo).
// Emails every opted-in space's owner the Obrigações that are Vencida:
// Contas and parcelas de Financiamento alike, named, with the total.
//
// Stateless. Each run is a function of today's data alone, so an Obrigação
// left unpaid is mailed about again tomorrow and a send that fails is simply
// retried by the next run. Nothing records which Obrigações have been
// mentioned. See docs/adr/0002-avisos-are-stateless-and-repeat-daily.md.
//
// Authorizes itself: /api/* is excluded from the auth proxy, so a route that
// leans on the proxy is a route with no gate at all.
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const host = request.headers.get("host");
  if (!host) {
    return Response.json({ error: "Missing host header" }, { status: 400 });
  }
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const baseUrl = `${proto}://${host}`;

  // One clock reading for the whole run, so a run spanning midnight can't
  // summarise one space as of today and the next as of tomorrow.
  const today = todayYmd();

  const admin = createAdminClient();

  const { data: allSpaces, error: spacesError } = await admin
    .from("spaces")
    .select("id");
  if (spacesError) {
    return Response.json(
      { error: `Failed to list spaces: ${spacesError.message}` },
      { status: 500 }
    );
  }

  // Absence of a settings row means enabled, so the filter is every space
  // minus the ones that explicitly opted out.
  const { data: optedOut } = await admin
    .from("notification_settings")
    .select("space_id")
    .eq("overdue_aviso_enabled", false);

  const optedOutSet = new Set((optedOut ?? []).map((r) => r.space_id as string));
  const optInSpaces = (allSpaces ?? []).filter((s) => !optedOutSet.has(s.id));

  let sent = 0;
  let empty = 0;
  let failed = 0;

  for (const space of optInSpaces) {
    // One space's failure must not cost every later space its Aviso.
    try {
      const result = await performOverdueAvisoSend(
        admin,
        space.id,
        baseUrl,
        today
      );
      if (result.sent) sent += 1;
      else empty += 1;
    } catch (e) {
      console.error(`Aviso failed for space ${space.id}:`, e);
      failed += 1;
    }
  }

  return Response.json({
    runDate: today,
    spaces: optInSpaces.length,
    sent,
    empty,
    failed,
  });
}
