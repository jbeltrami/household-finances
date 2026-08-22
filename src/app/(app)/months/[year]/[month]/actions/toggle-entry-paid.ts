"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { monthUrl } from "@/helpers/paths";
import { installmentPaymentPatch, writeOccurrence } from "@/helpers/occurrences";
import type { EntryMutationTarget } from "@/helpers/types";

// What the Conta behind an occurrence says, which is what decides whether a
// payment can cover several parcelas and what one of them is worth. Read
// from the row's Conta when there is a row, and straight from the Conta when
// the occurrence is still virtual.
type ContaFacts = {
  templateId: string | null;
  occurrenceDate: string;
  defaultAmount: number;
  isInstallment: boolean;
  currentCovered: number | null;
};

async function readContaFacts(
  supabase: SupabaseClient,
  target: EntryMutationTarget
): Promise<ContaFacts | null> {
  if (target.kind === "virtual") {
    const { data } = await supabase
      .from("recurring_bill_templates")
      .select("default_amount, installments_total")
      .eq("id", target.templateId)
      .maybeSingle();
    if (!data) return null;

    return {
      templateId: target.templateId,
      occurrenceDate: target.date,
      defaultAmount: Number(data.default_amount),
      isInstallment: data.installments_total != null,
      currentCovered: null,
    };
  }

  const { data } = await supabase
    .from("entries")
    .select(
      "template_id, date, installments_covered, recurring_bill_templates(default_amount, installments_total)"
    )
    .eq("id", target.entryId)
    .maybeSingle();
  if (!data) return null;

  const row = data as unknown as {
    template_id: string | null;
    date: string;
    installments_covered: number;
    recurring_bill_templates: {
      default_amount: number | string;
      installments_total: number | null;
    } | null;
  };

  return {
    templateId: row.template_id,
    occurrenceDate: row.date,
    defaultAmount: Number(row.recurring_bill_templates?.default_amount ?? 0),
    isInstallment: row.recurring_bill_templates?.installments_total != null,
    currentCovered: row.installments_covered,
  };
}

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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const facts = await readContaFacts(supabase, target);
  if (!facts) throw new Error("Conta recorrente não encontrada");

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
