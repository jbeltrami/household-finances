import { describe, expect, it } from "vitest";
import { buildSummary, type HydratedFinancing } from "../financing";
import type { ExtraPaymentRow, FinancingRow } from "../financing";

// `buildSummary` reads today's date to decide which amortizações have
// actually happened. Rather than injecting a clock, the fixtures sit far
// enough either side of any plausible "today" that the tests cannot rot:
// 2020 is unambiguously past, 2099 unambiguously future.
const PAST = "2020-06-15";
const FUTURE = "2099-06-15";

const financing: FinancingRow = {
  id: "fin-1",
  space_id: "space-1",
  category_id: null,
  name: "Apartamento",
  principal: 12000,
  interest_rate: 0,
  rate_period: "monthly",
  amortization_system: "sac",
  start_date: "2020-01-10",
  installments_total: 12,
  active: true,
  created_at: "2019-12-01T00:00:00Z",
};

function extra(date: string, amount: number): ExtraPaymentRow {
  return {
    id: `x-${date}`,
    financing_id: "fin-1",
    date,
    amount,
    effect: "reduce_term",
    notes: null,
  };
}

function hydrated(
  paid: number[] = [],
  extras: ExtraPaymentRow[] = []
): HydratedFinancing {
  const rows = Array.from({ length: 12 }, (_, i) => ({
    number: i + 1,
    date: `2020-${String(i + 1).padStart(2, "0")}-10`,
    payment: 1000,
    interest: 0,
    amortization: 1000,
    extraApplied: 0,
    balanceAfter: 12000 - (i + 1) * 1000,
  }));
  return {
    financing,
    extras,
    paidNumbers: new Set(paid),
    schedule: {
      rows,
      totals: { paid: 12000, interest: 0, principal: 12000, extra: 0 },
    },
  };
}

describe("buildSummary", () => {
  it("counts the parcelas marked paid", () => {
    const summary = buildSummary(hydrated([1, 2, 3]));
    expect(summary.paidCount).toBe(3);
    expect(summary.total).toBe(12);
    expect(summary.remaining).toBe(9);
  });

  it("owes the whole principal before anything is paid", () => {
    expect(buildSummary(hydrated()).outstandingBalance).toBe(12000);
  });

  it("reduces the balance by the principal each paid parcela amortized", () => {
    expect(buildSummary(hydrated([1, 2])).outstandingBalance).toBe(10000);
  });

  it("lets a recorded amortização reduce the balance immediately, before any parcela is paid", () => {
    expect(
      buildSummary(hydrated([], [extra(PAST, 3000)])).outstandingBalance
    ).toBe(9000);
  });

  it("does not let an amortização dated in the future reduce today's balance", () => {
    expect(
      buildSummary(hydrated([], [extra(FUTURE, 3000)])).outstandingBalance
    ).toBe(12000);
  });

  it("counts past amortizações and ignores future ones in the same list", () => {
    const summary = buildSummary(
      hydrated([], [extra(PAST, 2000), extra(FUTURE, 5000)])
    );
    expect(summary.outstandingBalance).toBe(10000);
  });

  it("never reports a negative balance", () => {
    expect(
      buildSummary(hydrated([], [extra(PAST, 99999)])).outstandingBalance
    ).toBe(0);
  });

  it("reports the next unpaid parcela as the current payment", () => {
    expect(buildSummary(hydrated([1, 2])).monthlyPayment).toBe(1000);
  });

  it("reports no payment once every parcela is settled", () => {
    const all = Array.from({ length: 12 }, (_, i) => i + 1);
    const summary = buildSummary(hydrated(all));
    expect(summary.monthlyPayment).toBe(0);
    expect(summary.remaining).toBe(0);
  });

  it("skips over a gap to the first unpaid parcela", () => {
    // Parcelas 1 and 3 paid: the next one owed is still 2.
    expect(buildSummary(hydrated([1, 3])).monthlyPayment).toBe(1000);
    expect(buildSummary(hydrated([1, 3])).paidCount).toBe(2);
  });
});
