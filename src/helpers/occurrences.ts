// Writing to a Conta recorrente occurrence.
//
// A Conta has no row until the user does something to one of its
// occurrences — pays it, changes its amount for that month, or ignores it.
// Turning an occurrence into a row is the move the whole ledger model rests
// on, and it used to be written out once per action: three copies of the
// lock check, three copies of the template lookup, and three copies of an
// insert whose most important property was a column it deliberately does
// NOT set.
//
// One interface now. Every mutation on an occurrence goes through it,
// whether or not a row exists yet, so a fourth one gets ADR-0001 right by
// construction rather than by copying a comment.

import type { SupabaseClient } from "@supabase/supabase-js";
import { checkDateEditable, checkEntryEditable } from "./lock";
import { requirePersonalSpaceId } from "./spaces";
import type { EntryMutationTarget } from "./types";

// The fields a mutation can set on an occurrence. Everything else about the
// row — its name, currency and, when it is being created, its amount — comes
// from the Conta behind it.
export type OccurrencePatch = {
  paid?: boolean;
  skipped?: boolean;
  amount?: number;
  installments_covered?: number;
};

export type OccurrenceWriteResult =
  | { ok: false; error: string }
  | {
      ok: true;
      entryId: string;
      spaceId: string;
      // The month the row landed in, so the caller can revalidate its page
      // without a second lookup.
      year: number;
      month: number;
    };

export async function writeOccurrence(
  supabase: SupabaseClient,
  target: EntryMutationTarget,
  patch: OccurrencePatch
): Promise<OccurrenceWriteResult> {
  if (target.kind === "materialized") {
    const check = await checkEntryEditable(supabase, target.entryId);
    if (!check.ok) return check;

    const { error } = await supabase
      .from("entries")
      .update(patch)
      .eq("id", target.entryId);
    if (error) {
      return { ok: false, error: `Falha ao salvar o lançamento: ${error.message}` };
    }

    return {
      ok: true,
      entryId: target.entryId,
      spaceId: check.spaceId,
      year: check.year,
      month: check.month,
    };
  }

  const spaceId = await requirePersonalSpaceId(supabase);

  const check = await checkDateEditable(supabase, spaceId, target.date);
  if (!check.ok) return check;

  const { data: template } = await supabase
    .from("recurring_bill_templates")
    .select("name, default_amount, currency")
    .eq("id", target.templateId)
    .maybeSingle();

  if (!template) return { ok: false, error: "Conta recorrente não encontrada" };

  const entryId = crypto.randomUUID();

  const { error } = await supabase.from("entries").insert({
    id: entryId,
    space_id: spaceId,
    date: target.date,
    name: template.name as string,
    amount: Number(template.default_amount),
    currency: template.currency as string,
    // What makes this row an exception to the Conta rather than a one-off
    // Despesa. Without it the occurrence would leave the Contas side of the
    // ledger entirely and stop inheriting anything.
    template_id: target.templateId,
    paid: false,
    skipped: false,
    installments_covered: 1,
    ...patch,
    // No `category_id` here, and this is the one place that decides so.
    // Leaving it NULL is what makes the row inherit its Categoria from the
    // Conta, so recategorising the Conta later moves this payment with it
    // instead of stranding it under the old name. The amount above IS
    // copied, because what was paid is a fact about this payment rather
    // than a description of the bill.
    // See docs/adr/0001-categories-are-referenced-not-snapshotted.md
    category_id: null,
  });

  if (error) {
    return { ok: false, error: `Falha ao salvar o lançamento: ${error.message}` };
  }

  return {
    ok: true,
    entryId,
    spaceId,
    year: check.year,
    month: check.month,
  };
}

// What marking an occurrence paid (or unpaid) should write.
//
// Pure, and separated from the action because the rules read as fiddly and
// are easy to get subtly wrong: a payment can absorb several parcelas of a
// Conta parcelada, which scales the amount, and undoing one has to put the
// amount back — but only if it was scaled in the first place. On an
// ordinary Conta the amount is left out of the patch entirely, because the
// row may be carrying an override the user typed and nothing here should
// overwrite it.
//
// `currentCovered` is null when no row exists yet. A row being created
// takes the Conta's default amount from `writeOccurrence`, so there is
// nothing for the patch to say.
export function installmentPaymentPatch(args: {
  newPaid: boolean;
  covered: number;
  isInstallment: boolean;
  defaultAmount: number;
  currentCovered: number | null;
}): OccurrencePatch {
  const { newPaid, covered, isInstallment, defaultAmount, currentCovered } =
    args;

  // Covering more than one parcela only means anything on a Conta parcelada,
  // and only when paying.
  const prepaying = newPaid && isInstallment && covered > 1;

  const patch: OccurrencePatch = {
    paid: newPaid,
    installments_covered: prepaying ? covered : 1,
  };

  if (prepaying) {
    patch.amount = defaultAmount * covered;
  } else if (!newPaid && currentCovered != null && currentCovered > 1) {
    // Undoing a prepayment: put the amount back to one parcela, so paying
    // again starts from a clean slate.
    patch.amount = defaultAmount;
  }

  return patch;
}
