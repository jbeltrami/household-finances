"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveSession } from "@/helpers/session";
import { monthUrl } from "@/helpers/paths";
import { checkDateEditable } from "@/helpers/lock";
import { todayYmd } from "@/helpers/date";
import { type FormState } from "../form-state";

// Create an income entry. Routes by `expected_date`, not the viewed
// month — adding an April-viewed entry with a June date lands it in
// June. The lock check runs against the target month, so adding to a
// locked month is rejected even when the viewed page is unlocked.
export async function createIncomeEntry(
  viewedYear: number,
  viewedMonth: number,
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  void prevState;

  try {
    const supabase = await createClient();

    const session = await resolveSession(supabase);
    if (!session.ok) return { error: session.error };
    const { spaceId } = session;

    const name = formData.get("name")?.toString().trim();
    const amountRaw = formData.get("amount")?.toString();
    const expectedDateRaw = formData.get("expected_date")?.toString().trim();

    // The name used to be required, and users compensated by cramming the
    // Pagador and the kind of income into it ("Freelance XYZ"). With both
    // modelled properly it becomes an optional free-text annotation; a
    // nameless Receita renders as "Pagador · Categoria".
    if (!amountRaw) return { error: "O valor é obrigatório" };

    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount < 0) {
      return { error: "O valor precisa ser um número positivo" };
    }

    const expectedDate = expectedDateRaw || todayYmd();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expectedDate)) {
      return { error: "Formato de data inválido" };
    }

    // Categoria and Pagador are both optional. Empty string is what an
    // unselected <select> submits.
    const categoryRaw = formData.get("category_id")?.toString().trim();
    const categoryId = categoryRaw ? categoryRaw : null;
    const payerRaw = formData.get("payer_id")?.toString().trim();
    const payerId = payerRaw ? payerRaw : null;

    const check = await checkDateEditable(supabase, spaceId, expectedDate);
    if (!check.ok) return { error: check.error };

    const { error } = await supabase.from("income_entries").insert({
      space_id: spaceId,
      expected_date: expectedDate,
      name: name || null,
      amount,
      currency: "BRL",
      category_id: categoryId,
      payer_id: payerId,
      received: false,
    });

    if (error) return { error: `Falha ao criar a receita: ${error.message}` };

    revalidatePath(monthUrl(viewedYear, viewedMonth));
    if (check.year !== viewedYear || check.month !== viewedMonth) {
      revalidatePath(monthUrl(check.year, check.month));
    }
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Algo deu errado" };
  }
}
