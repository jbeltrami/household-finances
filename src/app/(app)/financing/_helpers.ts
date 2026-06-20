// Presentational label maps shared across the financing route.

import type {
  AmortizationSystem,
  ExtraPaymentEffect,
  RatePeriod,
} from "@/helpers/amortization";

export function systemLabel(s: AmortizationSystem): string {
  return s === "sac"
    ? "SAC — parcela decrescente"
    : "Tabela Price — parcela fixa";
}

export function effectLabel(e: ExtraPaymentEffect): string {
  return e === "reduce_term" ? "Reduzir prazo" : "Reduzir parcela";
}

export function ratePeriodLabel(p: RatePeriod): string {
  return p === "monthly" ? "a.m." : "a.a.";
}

// "YYYY-MM-DD" → "DD/MM/YYYY" without timezone parsing.
export function formatYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return ymd;
  return `${d}/${m}/${y}`;
}
