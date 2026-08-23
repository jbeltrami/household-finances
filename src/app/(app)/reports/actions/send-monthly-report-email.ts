"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { baseUrlFrom, reportsUrl } from "@/helpers/paths";
import { sendMonthlyReportForCurrentUser } from "@/lib/email/send-monthly-report";

// Manual "Send by email" button on the reports page. The session lookup and
// the ownership proof live in sendMonthlyReportForCurrentUser, so this action
// cannot skip them by accident and a future caller inherits them.
export async function sendMonthlyReportEmail(reportId: string) {
  const headersList = await headers();
  const baseUrl = baseUrlFrom(
    headersList.get("host"),
    headersList.get("x-forwarded-proto")
  );
  if (!baseUrl) throw new Error("Cabeçalho host ausente");

  await sendMonthlyReportForCurrentUser(reportId, baseUrl);

  revalidatePath(reportsUrl());
}
