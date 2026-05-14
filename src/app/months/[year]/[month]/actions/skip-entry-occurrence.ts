"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { monthUrl } from "@/helpers/paths";
import { requirePersonalSpaceId } from "@/helpers/spaces";
import {
  checkDateEditable,
  checkEntryEditable,
} from "@/helpers/lock";

// Skip marks a single occurrence of a recurring template as cancelled
// for that date. Virtual → materialize as skipped=true. Materialized
// (and previously unskipped) → update skipped=true. Paid rows can't
// be skipped (schema CHECK enforces it); call toggleEntryPaid first
// to unpay them.
export type SkipTarget =
  | { kind: "materialized"; entryId: string }
  | { kind: "virtual"; templateId: string; date: string };

export async function skipEntryOccurrence(
  target: SkipTarget,
  formData: FormData
) {
  void formData;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  if (target.kind === "materialized") {
    const check = await checkEntryEditable(supabase, target.entryId);
    if (!check.ok) throw new Error(check.error);

    // Only template rows can be skipped; one-offs have no "skip"
    // semantics (they were created explicitly).
    const { data: row } = await supabase
      .from("entries")
      .select("template_id, paid")
      .eq("id", target.entryId)
      .single();

    if (!row?.template_id) {
      throw new Error("Só é possível ignorar ocorrências recorrentes");
    }
    if (row.paid) {
      throw new Error("Desmarque o pagamento antes de ignorar");
    }

    const { error } = await supabase
      .from("entries")
      .update({ skipped: true })
      .eq("id", target.entryId);

    if (error) throw new Error(`Falha ao ignorar a ocorrência: ${error.message}`);

    revalidatePath(monthUrl(check.year, check.month));
    return;
  }

  const spaceId = await requirePersonalSpaceId(supabase);

  const check = await checkDateEditable(supabase, spaceId, target.date);
  if (!check.ok) throw new Error(check.error);

  const { data: template } = await supabase
    .from("recurring_bill_templates")
    .select("name, default_amount, currency, category")
    .eq("id", target.templateId)
    .single();

  if (!template) throw new Error("Conta recorrente não encontrada");

  const { error } = await supabase.from("entries").insert({
    space_id: spaceId,
    date: target.date,
    name: template.name,
    amount: template.default_amount,
    currency: template.currency,
    category: template.category,
    paid: false,
    skipped: true,
    template_id: target.templateId,
    installments_covered: 1,
  });

  if (error) throw new Error(`Falha ao ignorar a ocorrência: ${error.message}`);

  revalidatePath(monthUrl(check.year, check.month));
}

// Undo a skip — flip skipped back to false. If that leaves the row
// identical to the virtual default, callers may prefer to delete it
// instead (via deleteEntry) so the row returns to pure-virtual state.
export async function unskipEntryOccurrence(
  entryId: string,
  formData: FormData
) {
  void formData;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const check = await checkEntryEditable(supabase, entryId);
  if (!check.ok) throw new Error(check.error);

  const { error } = await supabase
    .from("entries")
    .update({ skipped: false })
    .eq("id", entryId);

  if (error) throw new Error(`Falha ao reverter o ignorar: ${error.message}`);

  revalidatePath(monthUrl(check.year, check.month));
}
