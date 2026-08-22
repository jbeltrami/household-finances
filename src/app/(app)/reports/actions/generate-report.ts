"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/helpers/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { performReportGeneration } from "@/helpers/reports";
import { reportsUrl } from "@/helpers/paths";
import { currentYearMonth, yearMonthKey } from "@/helpers/date";

// Generate (or regenerate) the report PDF for one past month. Throws
// on any failure since the UI calls this via useTransition and treats
// errors as toast-worthy events. The "Generate" button is hidden on
// empty months and on non-past months, so reaching those branches
// indicates either a stale page or someone hitting the action
// directly — both are unexpected states.
export async function generateReport(year: number, month: number) {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("Ano inválido");
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Mês inválido");
  }

  if (yearMonthKey(year, month) >= currentYearMonth()) {
    throw new Error("Só é possível gerar relatórios de meses passados");
  }

  const supabase = await createClient();
  const { spaceId } = await requireSession(supabase);


  const admin = createAdminClient();
  const result = await performReportGeneration(
    supabase,
    admin,
    spaceId,
    year,
    month
  );

  if (!result.generated) {
    throw new Error("Sem dados para esse mês");
  }

  revalidatePath(reportsUrl());
}
