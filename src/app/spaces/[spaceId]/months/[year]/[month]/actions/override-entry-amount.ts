"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { spaceMonthUrl } from "@/helpers/paths";
import {
  checkDateEditable,
  checkEntryEditable,
} from "@/helpers/lock";
import { type FormState } from "../form-state";

// Same target shape as toggleEntryPaid — either a materialized row or
// a virtual occurrence that will be materialized on first touch.
export type OverrideAmountTarget =
  | { kind: "materialized"; entryId: string }
  | {
      kind: "virtual";
      templateId: string;
      date: string;
      spaceId: string;
    };

export async function overrideEntryAmount(
  target: OverrideAmountTarget,
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

    const amountRaw = formData.get("amount")?.toString();
    if (!amountRaw) return { error: "Amount is required" };

    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount < 0) {
      return { error: "Amount must be a positive number" };
    }

    if (target.kind === "materialized") {
      const check = await checkEntryEditable(supabase, target.entryId);
      if (!check.ok) return { error: check.error };

      const { error } = await supabase
        .from("entries")
        .update({ amount })
        .eq("id", target.entryId);

      if (error) return { error: `Failed to update amount: ${error.message}` };

      revalidatePath(spaceMonthUrl(check.spaceId, check.year, check.month));
      return { error: null };
    }

    const check = await checkDateEditable(
      supabase,
      target.spaceId,
      target.date
    );
    if (!check.ok) return { error: check.error };

    const { data: template } = await supabase
      .from("recurring_bill_templates")
      .select("name, currency, category")
      .eq("id", target.templateId)
      .single();

    if (!template) return { error: "Template not found" };

    const { error } = await supabase.from("entries").insert({
      space_id: target.spaceId,
      date: target.date,
      name: template.name,
      amount,
      currency: template.currency,
      category: template.category,
      paid: false,
      skipped: false,
      template_id: target.templateId,
      installments_covered: 1,
    });

    if (error) return { error: `Failed to save override: ${error.message}` };

    revalidatePath(spaceMonthUrl(check.spaceId, check.year, check.month));
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
}
