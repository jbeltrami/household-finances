"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { spaceMonthUrl } from "@/helpers/paths";
import { checkBillInstanceEditable } from "../_helpers";

type InstanceWithTemplate = {
  id: string;
  month_id: string;
  template_id: string;
  installments_covered: number;
  amount: number | string;
  recurring_bill_templates: {
    default_amount: number | string;
    installments_total: number | null;
  } | null;
};

// Toggle paid state on a bill instance, optionally covering multiple
// installments. `covered` is the number of installments this single
// payment represents (default 1). On an installment bill, covered > 1
// auto-sets amount = default × covered and deletes future unpaid
// instances for the same template so the schedule compresses cleanly —
// syncBillInstances regenerates instances up to the new effective end
// on the next month visit.
//
// On unpay with a previously prepaid instance (covered > 1), we reset
// covered to 1 and amount to the template default. For normal (covered=1)
// instances we leave amount alone so per-instance overrides the user
// may have set manually are preserved.
export async function toggleBillPaid(
  id: string,
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

  const check = await checkBillInstanceEditable(supabase, id);
  if (!check.ok) throw new Error(check.error);

  const { data: raw } = await supabase
    .from("bill_instances")
    .select(
      "id, month_id, template_id, installments_covered, amount, recurring_bill_templates(default_amount, installments_total)"
    )
    .eq("id", id)
    .single();

  if (!raw) throw new Error("Bill not found");

  const inst = raw as unknown as InstanceWithTemplate;
  const isInstallment = inst.recurring_bill_templates?.installments_total != null;
  const defaultAmount = Number(inst.recurring_bill_templates?.default_amount ?? 0);

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
  } else {
    // Unpaying a previously-prepaid instance: reset coverage and amount
    // back to the template default. For a normal (covered=1) instance we
    // leave amount untouched so manual per-instance overrides survive.
    if (inst.installments_covered > 1) {
      updates.amount = defaultAmount;
    }
  }

  const { error: updateError } = await supabase
    .from("bill_instances")
    .update(updates)
    .eq("id", id);

  if (updateError) {
    throw new Error(`Failed to update bill: ${updateError.message}`);
  }

  // Compress the schedule: when prepaying on an installment bill, wipe
  // future unpaid instances for the same template. They'll be regenerated
  // up to the new effective end on subsequent month visits.
  if (newPaid && isInstallment && covered > 1) {
    const { data: futureMonths } = await supabase
      .from("months")
      .select("id")
      .eq("space_id", check.spaceId)
      .or(
        `year.gt.${check.year},and(year.eq.${check.year},month.gt.${check.month})`
      );

    const futureMonthIds = (futureMonths ?? []).map((m) => m.id);
    if (futureMonthIds.length > 0) {
      await supabase
        .from("bill_instances")
        .delete()
        .eq("template_id", inst.template_id)
        .eq("paid", false)
        .in("month_id", futureMonthIds);
    }
  }

  revalidatePath(spaceMonthUrl(check.spaceId, check.year, check.month));
}
