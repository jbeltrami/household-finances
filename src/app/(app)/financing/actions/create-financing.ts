"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePersonalSpaceId } from "@/helpers/spaces";
import { financingUrl, financingDetailUrl } from "@/helpers/paths";
import { type FormState } from "../form-state";
import { parseFinancingFields } from "./_helpers";

export async function createFinancing(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  void prevState;

  // Generated client-side so we don't need a .select() after insert (which
  // RLS would evaluate against the SELECT policy) — see the chicken-and-egg
  // gotcha in CLAUDE.md.
  let newId = "";

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    const spaceId = await requirePersonalSpaceId(supabase);
    const f = parseFinancingFields(formData);

    newId = crypto.randomUUID();
    const { error } = await supabase.from("financings").insert({
      id: newId,
      space_id: spaceId,
      name: f.name,
      category_id: f.categoryId,
      principal: f.principal,
      interest_rate: f.interestRate,
      rate_period: f.ratePeriod,
      amortization_system: f.system,
      start_date: f.startDate,
      installments_total: f.installmentsTotal,
    });

    if (error) {
      return { error: `Falha ao salvar o financiamento: ${error.message}` };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Algo deu errado" };
  }

  // redirect() throws a Next.js sentinel, so it must live outside the
  // try/catch or the success path would be mistaken for a failure.
  revalidatePath(financingUrl());
  redirect(financingDetailUrl(newId));
}
