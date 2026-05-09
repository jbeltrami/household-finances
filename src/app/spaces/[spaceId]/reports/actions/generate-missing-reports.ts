"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  listNonEmptyPastMonths,
  performReportGeneration,
} from "@/helpers/reports";
import { spaceReportsUrl } from "@/helpers/paths";

export type GenerateMissingResult = {
  generated: number;
  skipped: number;
  failed: number;
};

// Backfill any past month that has data but no report yet. Used by
// the "Gerar relatórios em falta" button. Continues on per-month
// errors so one bad month doesn't block the rest.
export async function generateMissingReports(
  spaceId: string
): Promise<GenerateMissingResult> {
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

  const candidates = await listNonEmptyPastMonths(supabase, spaceId);

  const { data: existing } = await supabase
    .from("monthly_reports")
    .select("year, month")
    .eq("space_id", spaceId);

  const existingKeys = new Set(
    (existing ?? []).map((r) => `${r.year}-${r.month}`)
  );

  const missing = candidates.filter(
    (c) => !existingKeys.has(`${c.year}-${c.month}`)
  );

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const { year, month } of missing) {
    try {
      const r = await performReportGeneration(
        supabase,
        admin,
        spaceId,
        year,
        month
      );
      if (r.generated) generated += 1;
      else skipped += 1;
    } catch {
      failed += 1;
    }
  }

  revalidatePath(spaceReportsUrl(spaceId));
  return { generated, skipped, failed };
}
