"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type FormState } from "../form-state";
import {
  UNIQUE_VIOLATION,
  cascadeAmountToFutureInstances,
  parseTemplateFields,
} from "./_helpers";

export async function updateBillTemplate(
  id: string,
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

    const { name, defaultAmount, dueDay } = parseTemplateFields(formData);
    const cascade = formData.get("cascade") === "on";

    const { error: updateError } = await supabase
      .from("recurring_bill_templates")
      .update({
        name,
        default_amount: defaultAmount,
        due_day: dueDay,
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

    revalidatePath("/bills");
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }

  // redirect() must be outside the try/catch because it works by throwing
  // a special Next.js sentinel error that the framework catches; if we
  // caught it ourselves we'd mistake the redirect for a failure.
  redirect("/bills");
}
