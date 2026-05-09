"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { performReportGeneration } from "@/helpers/reports";
import { spaceReportsUrl } from "@/helpers/paths";
import { currentYearMonth, yearMonthKey } from "@/helpers/date";

// Generate (or regenerate) the report PDF for one past month. Throws
// on any failure since the UI calls this via useTransition and treats
// errors as toast-worthy events. The "Generate" button is hidden on
// empty months and on non-past months, so reaching those branches
// indicates either a stale page or someone hitting the action
// directly — both are unexpected states.
export async function generateReport(
  spaceId: string,
  year: number,
  month: number
) {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("Invalid year");
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Invalid month");
  }

  if (yearMonthKey(year, month) >= currentYearMonth()) {
    throw new Error("Reports can only be generated for past months");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: space } = await supabase
    .from("spaces")
    .select("created_by")
    .eq("id", spaceId)
    .single();

  if (!space) throw new Error("Space not found");
  if (space.created_by !== user.id) {
    throw new Error("Only the space owner can generate reports");
  }

  const admin = createAdminClient();
  const result = await performReportGeneration(
    supabase,
    admin,
    spaceId,
    year,
    month
  );

  if (!result.generated) {
    throw new Error("No data to report for this month");
  }

  revalidatePath(spaceReportsUrl(spaceId));
}
