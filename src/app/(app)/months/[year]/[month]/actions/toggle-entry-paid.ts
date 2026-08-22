"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/helpers/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { monthUrl } from "@/helpers/paths";
import { installmentPaymentPatch, writeOccurrence } from "@/helpers/occurrences";
import { readContaFacts, type ContaFacts } from "./_helpers";
import type { EntryMutationTarget } from "@/helpers/types";

// On unpaid → paid, clear any matching WhatsApp notification log rows so the
// Conta is alert-eligible again if the user later flips it back to unpaid
// (typo, undo). Two key shapes to cover: the row's own id, and the
// (template, date) pair it was logged under while still virtual. The cron
// checks both, so both have to be cleared.
//
// Admin client because the log has no user-write policies; ownership was
// already established by the write above.
async function clearOverdueAlerts(facts: ContaFacts, entryId: string) {
  const admin = createAdminClient();

  await admin
    .from("whatsapp_notifications_sent")
    .delete()
    .eq("entry_id", entryId);

  if (facts.templateId) {
    await admin
      .from("whatsapp_notifications_sent")
      .delete()
      .eq("template_id", facts.templateId)
      .eq("occurrence_date", facts.occurrenceDate);
  }
}

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

  if (newPaid) await clearOverdueAlerts(facts, result.entryId);

  revalidatePath(monthUrl(result.year, result.month));
}
