"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePersonalSpaceId } from "@/helpers/spaces";
import { checkDateEditable } from "@/helpers/lock";
import { parseYearMonthFromYmd } from "@/helpers/date";
import { financingDetailUrl, monthUrl } from "@/helpers/paths";
import { type FormState } from "../form-state";
import { callerOwnsFinancing } from "./_helpers";

export async function addExtraPayment(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  void prevState;

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    const spaceId = await requirePersonalSpaceId(supabase);

    const financingId = String(formData.get("financing_id") ?? "");
    if (!financingId) return { error: "Financiamento não informado" };
    if (!(await callerOwnsFinancing(supabase, financingId))) {
      return { error: "Financiamento não encontrado" };
    }

    const date = String(formData.get("date") ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Data inválida" };

    const amount = Number(formData.get("amount"));
    if (!Number.isFinite(amount) || amount <= 0) {
      return { error: "Valor da amortização inválido" };
    }

    const effect = String(formData.get("effect") ?? "");
    if (effect !== "reduce_term" && effect !== "reduce_installment") {
      return { error: "Efeito da amortização inválido" };
    }

    const notes = String(formData.get("notes") ?? "").trim() || null;

    // A locked past month blocks new extra payments, mirroring the
    // entries lock-by-date rule.
    const check = await checkDateEditable(supabase, spaceId, date);
    if (!check.ok) return { error: check.error };

    const { error } = await supabase.from("financing_extra_payments").insert({
      space_id: spaceId,
      financing_id: financingId,
      date,
      amount,
      effect,
      notes,
    });

    if (error) {
      return { error: `Falha ao registrar a amortização: ${error.message}` };
    }

    revalidatePath(financingDetailUrl(financingId));
    const parsed = parseYearMonthFromYmd(date);
    if (parsed) revalidatePath(monthUrl(parsed.year, parsed.month));
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Algo deu errado" };
  }
}
