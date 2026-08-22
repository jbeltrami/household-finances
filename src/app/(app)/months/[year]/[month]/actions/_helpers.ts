// Non-"use server" helpers for the monthly-view actions. A `"use server"`
// file may only export async functions, so the type and the read that goes
// with it live here. See CLAUDE.md → "`use server` files only export async
// functions".

import type { SupabaseClient } from "@supabase/supabase-js";
import type { EntryMutationTarget } from "@/helpers/types";

// What the Conta behind an occurrence says, which is what decides whether a
// payment can cover several parcelas and what one of them is worth. Read
// from the row's Conta when there is a row, and straight from the Conta when
// the occurrence is still virtual.
export type ContaFacts = {
  templateId: string | null;
  occurrenceDate: string;
  defaultAmount: number;
  isInstallment: boolean;
  currentCovered: number | null;
};

export async function readContaFacts(
  supabase: SupabaseClient,
  target: EntryMutationTarget
): Promise<ContaFacts | null> {
  if (target.kind === "virtual") {
    const { data } = await supabase
      .from("recurring_bill_templates")
      .select("default_amount, installments_total")
      .eq("id", target.templateId)
      .maybeSingle();
    if (!data) return null;

    return {
      templateId: target.templateId,
      occurrenceDate: target.date,
      defaultAmount: Number(data.default_amount),
      isInstallment: data.installments_total != null,
      currentCovered: null,
    };
  }

  const { data } = await supabase
    .from("entries")
    .select(
      "template_id, date, installments_covered, recurring_bill_templates(default_amount, installments_total)"
    )
    .eq("id", target.entryId)
    .maybeSingle();
  if (!data) return null;

  const row = data as unknown as {
    template_id: string | null;
    date: string;
    installments_covered: number;
    recurring_bill_templates: {
      default_amount: number | string;
      installments_total: number | null;
    } | null;
  };

  return {
    templateId: row.template_id,
    occurrenceDate: row.date,
    defaultAmount: Number(row.recurring_bill_templates?.default_amount ?? 0),
    isInstallment: row.recurring_bill_templates?.installments_total != null,
    currentCovered: row.installments_covered,
  };
}
