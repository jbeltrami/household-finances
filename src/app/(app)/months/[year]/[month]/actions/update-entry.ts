"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { monthUrl } from "@/helpers/paths";
import { checkEntryEditable } from "@/helpers/lock";
import { categoryFor, isBillIconKey } from "@/lib/icons/bills";
import { type FormState } from "../form-state";

// Update an existing entry row. Covers renames, icon changes (which
// re-derive the category), notes edits, and amount overrides for
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
    const category = categoryFor(icon);

    const { error } = await supabase
      .from("entries")
      .update({
        name,
        amount,
        category,
        icon,
        notes: notesRaw || null,
      })
      .eq("id", entryId);

    if (error) return { error: `Falha ao atualizar o lançamento: ${error.message}` };

    revalidatePath(monthUrl(check.year, check.month));
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Algo deu errado" };
  }
}
