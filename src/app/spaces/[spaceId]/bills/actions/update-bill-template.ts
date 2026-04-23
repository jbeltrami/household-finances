"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { spaceBillsUrl } from "@/helpers/paths";
import { type FormState } from "../form-state";
import {
  UNIQUE_VIOLATION,
  cascadeAmountToFutureInstances,
  computeBiweeklyAnchor,
  parseTemplateFields,
} from "./_helpers";

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
      cadence,
      dueDay,
      dayOfWeek,
      installmentsTotal,
      installmentsStartMonth,
    } = parseTemplateFields(formData);
    const cascade = formData.get("cascade") === "on";

    // For biweekly: if the template already has an anchor AND the
    // day_of_week hasn't changed, keep the existing anchor to preserve
    // the phase. Otherwise compute a new one from today.
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

    if (cascade) {
      await cascadeAmountToFutureInstances(supabase, id, defaultAmount);
    }

    revalidatePath(spaceBillsUrl(spaceId));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }

  // redirect() must be outside the try/catch because it works by throwing
  // a special Next.js sentinel error that the framework catches; if we
  // caught it ourselves we'd mistake the redirect for a failure. spaceId
  // is assigned inside the try but TypeScript's narrowing tracks it here.
  redirect(spaceBillsUrl(spaceId));
}
