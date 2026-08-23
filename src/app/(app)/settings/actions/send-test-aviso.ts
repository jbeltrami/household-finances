"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSession } from "@/helpers/session";
import { todayYmd } from "@/helpers/date";
import { baseUrlFrom, settingsUrl } from "@/helpers/paths";
import { performOverdueAvisoSend } from "@/lib/email/send-overdue-aviso";
import type { TestAvisoResult } from "../_types";

// Send a real Aviso, built from this space's current data, to the signed-in
// owner. Not a fixture: a test that renders invented rows proves the template
// compiles and nothing else, while this exercises the same hydration,
// projection and transport the cron uses.
//
// It follows that with nothing Vencida there is nothing to send, and saying so
// is the honest answer — it tells the user the pipeline ran and found the
// month clean, which is more information than a fabricated row would carry.
//
// The space comes from the session, so a user can only ever mail themselves.
export async function sendTestAviso(): Promise<TestAvisoResult> {
  try {
    const supabase = await createClient();
    const { spaceId } = await requireSession(supabase);

    const headersList = await headers();
    const baseUrl = baseUrlFrom(
      headersList.get("host"),
      headersList.get("x-forwarded-proto")
    );
    if (!baseUrl) return { kind: "error", message: "Cabeçalho host ausente" };

    const admin = createAdminClient();
    const result = await performOverdueAvisoSend(
      admin,
      spaceId,
      baseUrl,
      todayYmd()
    );

    if (!result.sent) return { kind: "nothing-vencida" };

    // A real send writes the receipt, so the page has to re-read it.
    revalidatePath(settingsUrl());
    return { kind: "sent", count: result.count };
  } catch (e) {
    return {
      kind: "error",
      message: e instanceof Error ? e.message : "Falha ao enviar o aviso",
    };
  }
}
