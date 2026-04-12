"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type FormState } from "../form-state";
import {
  UNIQUE_VIOLATION,
  getPersonalSpace,
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

    const personalSpace = await getPersonalSpace(supabase);
    const { name, defaultAmount, dueDay } = parseTemplateFields(formData);

    const { error: insertError } = await supabase
      .from("recurring_bill_templates")
      .insert({
        space_id: personalSpace.id,
        name,
        default_amount: defaultAmount,
        currency: "BRL",
        due_day: dueDay,
      });

    if (insertError) {
      if (insertError.code === UNIQUE_VIOLATION) {
        return { error: `An active template named "${name}" already exists` };
      }
      return { error: `Failed to create template: ${insertError.message}` };
    }

    revalidatePath("/bills");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
}
