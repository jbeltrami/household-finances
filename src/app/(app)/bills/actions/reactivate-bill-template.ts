"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveSession } from "@/helpers/session";
import { billsUrl } from "@/helpers/paths";
import { type FormState } from "../form-state";
import { UNIQUE_VIOLATION } from "./_helpers";

// Bring a deactivated Conta back.
//
// Returns FormState rather than throwing, unlike its deactivate counterpart,
// because this one has a predictable failure the user needs to read: the
// partial unique index covers only active rows, so the name freed by
// deactivating may since have been taken by a new Conta.
export async function reactivateBillTemplate(id: string): Promise<FormState> {
  try {
    const supabase = await createClient();

    const session = await resolveSession(supabase);
    if (!session.ok) return { error: session.error };

    const { error } = await supabase
      .from("recurring_bill_templates")
      .update({ active: true })
      .eq("id", id);

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        return {
          error:
            "Já existe uma conta ativa com esse nome. Renomeie uma das duas antes de reativar.",
        };
      }
      return { error: `Falha ao reativar a conta: ${error.message}` };
    }

    revalidatePath(billsUrl());
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Algo deu errado" };
  }
}
