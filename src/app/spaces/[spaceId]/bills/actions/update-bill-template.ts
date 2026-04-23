"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { spaceBillsUrl } from "@/helpers/paths";
import { type FormState } from "../form-state";
import {
  UNIQUE_VIOLATION,
  computeBiweeklyAnchor,
  parseTemplateFields,
} from "./_helpers";

// Update a template. No cascade step — in the ledger model, virtual
// occurrences always reflect the template's current default_amount,
// so changing the template automatically updates every unpaid
// occurrence that hasn't been explicitly overridden. Existing
// materialized exception rows (overrides, paid rows) stay frozen
// on purpose; editing them is a per-entry concern.
export async function updateBillTemplate(
  id: string,
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  void prevState;

  let spaceId: string | undefined;

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    spaceId = formData.get("space_id")?.toString();
    if (!spaceId) return { error: "Missing space context" };

    const {
      name,
      defaultAmount,
      category,
      cadence,
      dueDay,
      dayOfWeek,
      installmentsTotal,
      installmentsStartMonth,
    } = parseTemplateFields(formData);

    // Preserve the existing biweekly anchor when the user stays on
    // biweekly and doesn't change day_of_week. This keeps the phase
    // stable so existing materialized rows don't suddenly fall on
    // "different" virtual occurrences after an edit.
    let biweeklyAnchor: string | null = null;
    if (cadence === "biweekly" && dayOfWeek != null) {
      const { data: existing } = await supabase
        .from("recurring_bill_templates")
        .select("day_of_week, biweekly_anchor")
        .eq("id", id)
        .single();

      if (
        existing?.biweekly_anchor &&
        existing?.day_of_week === dayOfWeek
      ) {
        biweeklyAnchor = existing.biweekly_anchor as string;
      } else {
        biweeklyAnchor = computeBiweeklyAnchor(dayOfWeek);
      }
    }

    const { error: updateError } = await supabase
      .from("recurring_bill_templates")
      .update({
        name,
        default_amount: defaultAmount,
        category,
        cadence,
        due_day: cadence === "monthly" ? dueDay : null,
        day_of_week: cadence !== "monthly" ? dayOfWeek : null,
        biweekly_anchor: biweeklyAnchor,
        installments_total: installmentsTotal,
        installments_start_month: installmentsStartMonth,
      })
      .eq("id", id);

    if (updateError) {
      if (updateError.code === UNIQUE_VIOLATION) {
        return { error: `An active template named "${name}" already exists` };
      }
      return { error: `Failed to update template: ${updateError.message}` };
    }

    revalidatePath(spaceBillsUrl(spaceId));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }

  redirect(spaceBillsUrl(spaceId));
}
