"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveSession } from "@/helpers/session";
import { monthUrl } from "@/helpers/paths";
import { checkDateEditable } from "@/helpers/lock";
import { todayYmd } from "@/helpers/date";
import { isIconKey } from "@/lib/icons/registry";
import { type FormState } from "../form-state";

// Create a one-off entry (money-out event with no template). The
// viewed year/month informs the default date, but the entry routes
// by its `date` field, so a user adding an entry with a date in a
// different month naturally lands it there.
//
// Categoria is an explicit, optional choice. It used to be derived from
// the picked icon, which meant choosing a coffee cup silently filed the
// Despesa under "Consumo". Icon and Categoria are now independent: a
// Despesa with no icon of its own displays its Categoria's.
export async function createOneOffEntry(
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
    const dateRaw = formData.get("date")?.toString().trim();
    const iconRaw = formData.get("icon")?.toString().trim();
    const notesRaw = formData.get("notes")?.toString().trim();

    if (!name) return { error: "O nome é obrigatório" };
    if (!amountRaw) return { error: "O valor é obrigatório" };

    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount < 0) {
      return { error: "O valor precisa ser um número positivo" };
    }

    // Every entry must have a date. If the user leaves it blank, default
    // to today — one-off entries represent real spending and "sometime
    // this month" isn't useful for cash-flow math.
    const date = dateRaw || todayYmd();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { error: "Formato de data inválido" };
    }

    let icon: string | null = null;
    if (iconRaw) {
      if (!isIconKey(iconRaw)) return { error: "Ícone inválido" };
      icon = iconRaw;
    }

    // Empty string is what an unselected <select> submits.
    const categoryRaw = formData.get("category_id")?.toString().trim();
    const categoryId = categoryRaw ? categoryRaw : null;

    const check = await checkDateEditable(supabase, spaceId, date);
    if (!check.ok) return { error: check.error };

    const { error } = await supabase.from("entries").insert({
      space_id: spaceId,
      date,
      name,
      amount,
      currency: "BRL",
      category_id: categoryId,
      icon,
      notes: notesRaw || null,
      paid: false,
      skipped: false,
      template_id: null,
      installments_covered: 1,
    });

    if (error) return { error: `Falha ao criar o lançamento: ${error.message}` };

    revalidatePath(monthUrl(viewedYear, viewedMonth));
    if (check.year !== viewedYear || check.month !== viewedMonth) {
      revalidatePath(monthUrl(check.year, check.month));
    }
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Algo deu errado" };
  }
}
