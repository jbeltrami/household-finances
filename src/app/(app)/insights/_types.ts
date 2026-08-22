// Route-local types and display copy for /insights.

import type { Insight } from "@/helpers/types";

// Presentational metadata for each benchmark card, keyed by the
// Insight `key`. `compareLabel` is the wording for the actual-vs-target
// line on the two comparable cards; null for pure target/reference
// cards. `meaning` is the short explainer shown under the title.
export type InsightMeta = {
  title: string;
  meaning: string;
  // Wording for the row that shows the user's real average, or null
  // when the card is a target figure with nothing to compare.
  compareLabel: string | null;
};

export const INSIGHT_META: Record<Insight["key"], InsightMeta> = {
  recommendedSavings: {
    title: "Poupança recomendada / mês",
    meaning: "Quanto você deveria guardar por mês (% da renda média).",
    compareLabel: "Sobra atual (renda − gastos)",
  },
  maxFixedExpenses: {
    title: "Teto de gastos fixos / mês",
    meaning: "Limite saudável para suas contas recorrentes (% da renda).",
    compareLabel: "Média de contas fixas",
  },
  maxMortgage: {
    title: "Teto de moradia / mês",
    meaning: "Parcela máxima de moradia (aluguel/financiamento) por mês.",
    compareLabel: "Média de parcelas de financiamento",
  },
  emergencyFund: {
    title: "Reserva de emergência",
    meaning: "Meses de gastos guardados para imprevistos.",
    compareLabel: null,
  },
  financialFreedom: {
    title: "Independência financeira",
    meaning: "Patrimônio para viver dos rendimentos (regra dos 4%).",
    compareLabel: null,
  },
};
