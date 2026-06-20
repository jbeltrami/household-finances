"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePersonalSpaceId } from "@/helpers/spaces";
import { insightsUrl } from "@/helpers/paths";
import type { FormState } from "../form-state";

// Parse a percent-typed field (entered as a whole number like "20")
// into a fraction (0.20). Returns null when missing/invalid.
function parsePercent(value: FormDataEntryValue | null): number | null {
  if (value == null) return null;
  const n = Number(String(value).replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return n / 100;
}

// Parse a plain non-negative number (the wealth multipliers).
function parseCount(value: FormDataEntryValue | null): number | null {
  if (value == null) return null;
  const n = Number(String(value).replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

// Save the user's ideal-budget parameters. The three rates are entered
// in the form as percentages (e.g. 20) and stored as fractions (0.20);
// the two wealth multipliers are stored as-is. RLS (is_active_member)
// gates the upsert. Returns FormState so the form renders errors
// inline (per the project convention — actions return, don't throw).
export async function saveIdealBudget(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const savingsRate = parsePercent(formData.get("savings_rate"));
  const maxMortgageRate = parsePercent(formData.get("max_mortgage_rate"));
  const maxFixedRate = parsePercent(formData.get("max_fixed_rate"));
  const emergencyMonths = parseCount(formData.get("emergency_months"));
  const freedomAnnualMult = parseCount(formData.get("freedom_annual_mult"));

  if (
    savingsRate == null ||
    maxMortgageRate == null ||
    maxFixedRate == null ||
    emergencyMonths == null ||
    freedomAnnualMult == null
  ) {
    return { error: "Preencha todos os campos com números válidos." };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const spaceId = await requirePersonalSpaceId(supabase);

  const { error } = await supabase.from("ideal_budget_settings").upsert(
    {
      space_id: spaceId,
      savings_rate: savingsRate,
      max_mortgage_rate: maxMortgageRate,
      max_fixed_rate: maxFixedRate,
      emergency_months: emergencyMonths,
      freedom_annual_mult: freedomAnnualMult,
    },
    { onConflict: "space_id" }
  );

  if (error) {
    return { error: `Falha ao salvar os parâmetros: ${error.message}` };
  }

  revalidatePath(insightsUrl());
  return { error: null };
}
