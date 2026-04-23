"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { spaceMonthUrl } from "@/helpers/paths";
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
    throw new Error("Covered must be a positive integer");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (target.kind === "materialized") {
    const check = await checkEntryEditable(supabase, target.entryId);
    if (!check.ok) throw new Error(check.error);

    const { data: row } = await supabase
      .from("entries")
      .select(
        "template_id, installments_covered, amount, recurring_bill_templates(default_amount, installments_total)"
      )
      .eq("id", target.entryId)
      .single();

    if (!row) throw new Error("Entry not found");

    const joined = row as unknown as {
      template_id: string | null;
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

    if (error) throw new Error(`Failed to update entry: ${error.message}`);

    revalidatePath(spaceMonthUrl(check.spaceId, check.year, check.month));
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

  if (!template) throw new Error("Template not found");

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

  if (error) throw new Error(`Failed to record payment: ${error.message}`);

  revalidatePath(spaceMonthUrl(check.spaceId, check.year, check.month));
}
