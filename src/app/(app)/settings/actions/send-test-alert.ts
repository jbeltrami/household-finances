"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { todayYmd } from "@/helpers/date";
import { baseUrlFrom, settingsUrl } from "@/helpers/paths";
import { sendOverdueAlertForCurrentUser } from "@/lib/email/send-overdue-alert";
import type { TestAlertResult } from "../_types";

// Send a real Aviso, built from this space's current data, to the signed-in
// owner. Not a fixture: a test that renders invented rows proves the template
// compiles and nothing else, while this exercises the same hydration,
// projection and transport the cron uses.
//
// It follows that with nothing Vencida there is nothing to send, and saying so
// is the honest answer — it tells the user the pipeline ran and found the
// month clean, which is more information than a fabricated row would carry.
//
// No space id passes through this action. sendOverdueAlertForCurrentUser
// resolves it from the session itself, so there is nothing here for a form
// field to supply and nothing for a future caller to get wrong.
export async function sendTestAlert(): Promise<TestAlertResult> {
  try {
    const headersList = await headers();
    const baseUrl = baseUrlFrom(
      headersList.get("host"),
      headersList.get("x-forwarded-proto")
    );
    if (!baseUrl) return { kind: "error", message: "Cabeçalho host ausente" };

    const result = await sendOverdueAlertForCurrentUser(baseUrl, todayYmd());

    if (!result.sent) {
      return result.reason === "rate-limited"
        ? { kind: "rate-limited", retryAt: result.retryAt }
        : { kind: "nothing-overdue" };
    }

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
