"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { monthUrl } from "@/helpers/paths";
import { checkEntryEditable } from "@/helpers/lock";
import { isBillIconKey } from "@/lib/icons/bills";
import { type FormState } from "../form-state";

// Update an existing entry row. Covers renames, icon changes, Categoria
// changes, notes edits, and amount overrides for
// template-exception rows (overrideEntryAmount is a thin shim for the
// virtual case). Date is intentionally not editable — changing it could
// move the entry to a different month, which is clearer as delete + create.
export async function updateEntry(
  entryId: string,
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

    const check = await checkEntryEditable(supabase, entryId);
    if (!check.ok) return { error: check.error };

    const name = formData.get("name")?.toString().trim();
    const amountRaw = formData.get("amount")?.toString();
    const iconRaw = formData.get("icon")?.toString().trim();
    const notesRaw = formData.get("notes")?.toString().trim();

    if (!name) return { error: "O nome é obrigatório" };
    if (!amountRaw) return { error: "O valor é obrigatório" };

    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount < 0) {
      return { error: "O valor precisa ser um número positivo" };
    }

    let icon: string | null = null;
    if (iconRaw) {
      if (!isBillIconKey(iconRaw)) return { error: "Ícone inválido" };
      icon = iconRaw;
    }

    // This action can reach template-bound rows as well as one-off
    // Despesas, and the two want different treatment. On a template-bound
    // row, `category_id` NULL means "inherit from the template" (ADR 0001),
    // so writing one here would silently pin that occurrence to a Categoria
    // and break the guarantee that recategorising a Conta moves its whole
    // history. Only one-offs get their Categoria set from this form.
    //
    // Today only ExpenseEntryRow calls this, and it only renders for
    // one-offs — but the guard makes the invariant explicit rather than
    // leaving it resting on that staying true.
    const { data: existing } = await supabase
      .from("entries")
      .select("template_id")
      .eq("id", entryId)
      .single();

    const patch: Record<string, unknown> = {
      name,
      amount,
      icon,
      notes: notesRaw || null,
    };

    if (existing?.template_id == null) {
      const categoryRaw = formData.get("category_id")?.toString().trim();
      patch.category_id = categoryRaw ? categoryRaw : null;
    }

    const { error } = await supabase
      .from("entries")
      .update(patch)
      .eq("id", entryId);

    if (error) return { error: `Falha ao atualizar o lançamento: ${error.message}` };

    revalidatePath(monthUrl(check.year, check.month));
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Algo deu errado" };
  }
}
