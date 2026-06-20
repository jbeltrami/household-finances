// Non-"use server" helpers for the financing actions: field parsing and
// the Postgres unique-violation code.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AmortizationSystem, RatePeriod } from "@/helpers/amortization";

export const UNIQUE_VIOLATION = "23505";

// True only if the financing is visible to the caller under RLS — i.e. it
// belongs to their space. The child tables (extra payments, installment
// payments) carry their own space_id, so RLS' WITH CHECK only verifies the
// caller's space, NOT that the referenced financing belongs to it. Without
// this guard a caller could write rows referencing another user's financing
// id. Use it to gate every write that takes a client-supplied financing id.
export async function callerOwnsFinancing(
  supabase: SupabaseClient,
  financingId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("financings")
    .select("id")
    .eq("id", financingId)
    .maybeSingle();
  return data != null;
}

export type FinancingFields = {
  name: string;
  principal: number;
  interestRate: number;
  ratePeriod: RatePeriod;
  system: AmortizationSystem;
  startDate: string;
  installmentsTotal: number;
};

// Validate and coerce the 5 simulator fields (+ name) from a submitted form.
// Throws a friendly pt-BR message on the first invalid field; the calling
// action catches it and returns it as form-state error.
export function parseFinancingFields(formData: FormData): FinancingFields {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Informe um nome para o financiamento");

  const principal = Number(formData.get("principal"));
  if (!Number.isFinite(principal) || principal <= 0) {
    throw new Error("Valor financiado inválido");
  }

  const interestRate = Number(formData.get("interest_rate"));
  if (!Number.isFinite(interestRate) || interestRate < 0) {
    throw new Error("Taxa de juros inválida");
  }

  const ratePeriod = String(formData.get("rate_period") ?? "");
  if (ratePeriod !== "monthly" && ratePeriod !== "annual") {
    throw new Error("Período da taxa inválido");
  }

  const system = String(formData.get("amortization_system") ?? "");
  if (system !== "sac" && system !== "price") {
    throw new Error("Sistema de amortização inválido");
  }

  const startDate = String(formData.get("start_date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    throw new Error("Data de início inválida");
  }

  const installmentsTotal = Number(formData.get("installments_total"));
  if (!Number.isInteger(installmentsTotal) || installmentsTotal <= 0) {
    throw new Error("Quantidade de parcelas inválida");
  }

  return {
    name,
    principal,
    interestRate,
    ratePeriod,
    system,
    startDate,
    installmentsTotal,
  };
}
