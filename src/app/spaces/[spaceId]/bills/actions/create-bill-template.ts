"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { spaceBillsUrl } from "@/helpers/paths";
import { type FormState } from "../form-state";
import {
  UNIQUE_VIOLATION,
  computeBiweeklyAnchor,
  parseTemplateFields,
} from "./_helpers";

export async function createBillTemplate(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  void prevState;

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    // spaceId comes from a hidden field rendered by the form. RLS is what
    // actually gates access — a forged or stale spaceId will just get
    // rejected by the insert policy, not bypass it.
    const spaceId = formData.get("space_id")?.toString();
    if (!spaceId) return { error: "Missing space context" };

    const { name, defaultAmount, cadence, dueDay, dayOfWeek } =
      parseTemplateFields(formData);

    const { error: insertError } = await supabase
      .from("recurring_bill_templates")
      .insert({
        space_id: spaceId,
        name,
        default_amount: defaultAmount,
        currency: "BRL",
        cadence,
        due_day: cadence === "monthly" ? dueDay : null,
        day_of_week: cadence !== "monthly" ? dayOfWeek : null,
        biweekly_anchor:
          cadence === "biweekly" && dayOfWeek != null
            ? computeBiweeklyAnchor(dayOfWeek)
            : null,
      });

    if (insertError) {
      if (insertError.code === UNIQUE_VIOLATION) {
        return { error: `An active template named "${name}" already exists` };
      }
      return { error: `Failed to create template: ${insertError.message}` };
    }

    revalidatePath(spaceBillsUrl(spaceId));
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
}
