"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/helpers/session";
import { monthUrl } from "@/helpers/paths";
import { installmentPaymentPatch, writeOccurrence } from "@/helpers/occurrences";
import { readContaFacts } from "./_helpers";
import type { EntryMutationTarget } from "@/helpers/types";

// `covered` only matters for a Conta parcelada. A payment with covered > 1
// is a prepayment — one payment absorbing several parcelas — and the amount
// scales to match.
export async function toggleEntryPaid(
  target: EntryMutationTarget,
  newPaid: boolean,
  covered: number,
  formData: FormData
) {
  void formData;

  if (!Number.isInteger(covered) || covered < 1) {
    throw new Error(
      "A quantidade de parcelas pagas precisa ser um inteiro positivo"
    );
  }

  const supabase = await createClient();

  await requireSession(supabase);

  const facts = await readContaFacts(supabase, target);
  if (!facts) {
    // Which thing is missing depends on what was aimed at. A row that has
    // gone is a lançamento; a virtual occurrence with no Conta behind it is
    // a Conta. CONTEXT.md keeps those words apart and so should this.
    throw new Error(
      target.kind === "materialized"
        ? "Lançamento não encontrado"
        : "Conta recorrente não encontrada"
    );
  }

  const result = await writeOccurrence(
    supabase,
    target,
    installmentPaymentPatch({
      newPaid,
      covered,
      isInstallment: facts.isInstallment,
      defaultAmount: facts.defaultAmount,
      currentCovered: facts.currentCovered,
    })
  );
  if (!result.ok) throw new Error(result.error);

  revalidatePath(monthUrl(result.year, result.month));
}
