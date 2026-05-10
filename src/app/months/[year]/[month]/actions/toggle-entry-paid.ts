"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { monthUrl } from "@/helpers/paths";
import {
  checkDateEditable,
  checkEntryEditable,
} from "@/helpers/lock";

// Two-shape target: either a materialized row (entryId) or a virtual
// occurrence identified by its template + date. Virtual occurrences
// materialize into a new `entries` row on first touch.
export type TogglePaidTarget =
  | { kind: "materialized"; entryId: string }
  | {
      kind: "virtual";
      templateId: string;
      date: string;
      spaceId: string;
    };

// `covered` only matters for installment templates. A prepayment with
// covered > 1 represents one payment absorbing multiple installments;
// amount auto-scales to default × covered. Unpaying a previously-
// prepaid row resets coverage to 1 and amount to the template default.
export async function toggleEntryPaid(
  target: TogglePaidTarget,
  newPaid: boolean,
  covered: number,
  formData: FormData
) {
  void formData;

  if (!Number.isInteger(covered) || covered < 1) {
    throw new Error("A quantidade de parcelas pagas precisa ser um inteiro positivo");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  if (target.kind === "materialized") {
    const check = await checkEntryEditable(supabase, target.entryId);
    if (!check.ok) throw new Error(check.error);

    const { data: row } = await supabase
      .from("entries")
      .select(
        "template_id, date, space_id, installments_covered, amount, recurring_bill_templates(default_amount, installments_total)"
      )
      .eq("id", target.entryId)
      .single();

    if (!row) throw new Error("Lançamento não encontrado");

    const joined = row as unknown as {
      template_id: string | null;
      date: string;
      space_id: string;
      installments_covered: number;
      amount: number | string;
      recurring_bill_templates: {
        default_amount: number | string;
        installments_total: number | null;
      } | null;
    };

    const isInstallment =
      joined.recurring_bill_templates?.installments_total != null;
    const defaultAmount = Number(
      joined.recurring_bill_templates?.default_amount ?? 0
    );

    const updates: {
      paid: boolean;
      installments_covered: number;
      amount?: number;
    } = { paid: newPaid, installments_covered: 1 };

    if (newPaid) {
      if (isInstallment && covered > 1) {
        updates.installments_covered = covered;
        updates.amount = defaultAmount * covered;
      }
    } else if (joined.installments_covered > 1) {
      // Unpaying a prepayment: reset coverage and amount to defaults so
      // the next time the user pays, they get a fresh slate.
      updates.amount = defaultAmount;
    }

    const { error } = await supabase
      .from("entries")
      .update(updates)
      .eq("id", target.entryId);

    if (error) throw new Error(`Falha ao atualizar o lançamento: ${error.message}`);

    // On unpaid → paid, clear any matching WhatsApp notification log
    // rows so the bill is alert-eligible again if the user later flips
    // it back to unpaid (typo, undo, etc.). Two key shapes to cover:
    //   (1) entry_id = the materialized row's id
    //   (2) (template_id, occurrence_date) = the row's logical key
    //       when it was a virtual occurrence (logged before being
    //       materialized). The cron checks both shapes too.
    // Admin client because the log table has no user-write policies;
    // ownership is already validated above via checkEntryEditable.
    if (newPaid) {
      const admin = createAdminClient();
      await admin
        .from("whatsapp_notifications_sent")
        .delete()
        .eq("entry_id", target.entryId);
      if (joined.template_id) {
        await admin
          .from("whatsapp_notifications_sent")
          .delete()
          .eq("template_id", joined.template_id)
          .eq("occurrence_date", joined.date);
      }
    }

    revalidatePath(monthUrl(check.year, check.month));
    return;
  }

  // Virtual occurrence → materialize. Fetch template for defaults.
  const check = await checkDateEditable(
    supabase,
    target.spaceId,
    target.date
  );
  if (!check.ok) throw new Error(check.error);

  const { data: template } = await supabase
    .from("recurring_bill_templates")
    .select(
      "name, default_amount, currency, category, installments_total"
    )
    .eq("id", target.templateId)
    .single();

  if (!template) throw new Error("Conta recorrente não encontrada");

  const isInstallment = template.installments_total != null;
  const defaultAmount = Number(template.default_amount);
  const effectiveCovered = newPaid && isInstallment && covered > 1 ? covered : 1;
  const amount =
    newPaid && isInstallment && covered > 1
      ? defaultAmount * covered
      : defaultAmount;

  const { error } = await supabase.from("entries").insert({
    space_id: target.spaceId,
    date: target.date,
    name: template.name,
    amount,
    currency: template.currency,
    category: template.category,
    paid: newPaid,
    skipped: false,
    template_id: target.templateId,
    installments_covered: effectiveCovered,
  });

  if (error) throw new Error(`Falha ao registrar o pagamento: ${error.message}`);

  // Same alert-eligibility reset as the materialized branch — but
  // here only the (template_id, occurrence_date) key can have a log
  // row, since the entry_id only just came into existence above.
  if (newPaid) {
    const admin = createAdminClient();
    await admin
      .from("whatsapp_notifications_sent")
      .delete()
      .eq("template_id", target.templateId)
      .eq("occurrence_date", target.date);
  }

  revalidatePath(monthUrl(check.year, check.month));
}
