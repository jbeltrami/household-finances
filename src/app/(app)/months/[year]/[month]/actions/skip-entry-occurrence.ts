"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/helpers/session";
import { monthUrl } from "@/helpers/paths";
import { writeOccurrence } from "@/helpers/occurrences";
import type { EntryMutationTarget } from "@/helpers/types";

// Skip marks a single occurrence of a Conta recorrente as cancelled for
// that date. A virtual occurrence is written as skipped on first touch; a
// row that already exists is updated. Paid rows can't be skipped (a schema
// CHECK enforces it); call toggleEntryPaid first to unpay them.
export async function skipEntryOccurrence(
  target: EntryMutationTarget,
  formData: FormData
) {
  void formData;

  const supabase = await createClient();

  await requireSession(supabase);

  // Both refusals are about the existing row, so they only apply to a
  // materialized target — a virtual one is a template occurrence by
  // definition, and cannot already be paid.
  if (target.kind === "materialized") {
    const { data: row } = await supabase
      .from("entries")
      .select("template_id, paid")
      .eq("id", target.entryId)
      .maybeSingle();

    // One-offs have no "skip" semantics — they were created explicitly.
    if (!row?.template_id) {
      throw new Error("Só é possível ignorar ocorrências recorrentes");
    }
    if (row.paid) {
      throw new Error("Desmarque o pagamento antes de ignorar");
    }
  }

  const result = await writeOccurrence(supabase, target, { skipped: true });
  if (!result.ok) throw new Error(result.error);

  revalidatePath(monthUrl(result.year, result.month));
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

  await requireSession(supabase);

  const result = await writeOccurrence(
    supabase,
    { kind: "materialized", entryId },
    { skipped: false }
  );
  if (!result.ok) throw new Error(result.error);

  revalidatePath(monthUrl(result.year, result.month));
}
