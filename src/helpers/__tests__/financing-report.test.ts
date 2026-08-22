import { describe, expect, it } from "vitest";
import { buildFinancingReport, type HydratedFinancing } from "../financing";
import type { FinancingRow, ExtraPaymentRow } from "../financing";

// A real schedule, built by the engine, so the as-of-month-end rules are
// exercised against the arithmetic they actually run on. Zero interest keeps
// the numbers readable: 12 parcelas of 1000 from Feb 2026.
const financing: FinancingRow = {
  id: "fin-1",
  space_id: "space-1",
  category_id: "cat-moradia",
  name: "Apartamento",
  principal: 12000,
  interest_rate: 0,
  rate_period: "monthly",
  amortization_system: "sac",
  start_date: "2026-02-10",
  installments_total: 12,
  active: true,
  created_at: "2026-01-01T00:00:00Z",
};

function extra(
  id: string,
  date: string,
  amount: number
): ExtraPaymentRow {
  return {
    id,
    financing_id: "fin-1",
    date,
    amount,
    effect: "reduce_term",
    notes: null,
  };
}

// The hydration hands over the loan, its extras and its paid parcelas; the
// projection rebuilds the schedule as of whichever month it is asked about,
// so the `schedule` field here is deliberately the today-view and unused.
function ledger(
  extras: ExtraPaymentRow[] = [],
  paid: number[] = [],
  overrides: Partial<FinancingRow> = {}
): HydratedFinancing[] {
  const f = { ...financing, ...overrides };
  return [
    {
      financing: f,
      extras,
      paidNumbers: new Set(paid),
      schedule: { rows: [], totals: { paid: 0, interest: 0, principal: 0, extra: 0 } },
    },
  ];
}

describe("buildFinancingReport", () => {
  it("reports the parcela falling in the month", () => {
    const { financings, installmentRows } = buildFinancingReport(
      ledger(),
      2026,
      4
    );
    expect(financings[0].installmentNumber).toBe(3);
    expect(financings[0].installmentAmount).toBe(1000);
    expect(installmentRows).toEqual([
      {
        date: "2026-04-10",
        name: "Financiamento Apartamento (3/12)",
        amount: 1000,
        paid: false,
      },
    ]);
  });

  it("leaves out a loan that had not started by the report month", () => {
    expect(buildFinancingReport(ledger(), 2026, 1).financings).toEqual([]);
  });

  it("does not let an amortização dated after the report month move its saldo", () => {
    const asOfMarch = buildFinancingReport(
      ledger([extra("x1", "2026-06-15", 4000)]),
      2026,
      3
    );
    const withNoExtra = buildFinancingReport(ledger(), 2026, 3);
    expect(asOfMarch.financings[0].outstandingBalance).toBe(
      withNoExtra.financings[0].outstandingBalance
    );
  });

  it("counts an amortização dated on or before the report month", () => {
    const report = buildFinancingReport(
      ledger([extra("x1", "2026-03-15", 4000)]),
      2026,
      3
    );
    expect(report.financings[0].outstandingBalance).toBe(8000);
  });

  it("does not count a parcela paid after the report month as paid in it", () => {
    // Parcela 8 (Sep 2026) is marked paid; the March report must not see it.
    const report = buildFinancingReport(ledger([], [8]), 2026, 3);
    expect(report.financings[0].paidCount).toBe(0);
    expect(report.financings[0].outstandingBalance).toBe(12000);
  });

  it("counts parcelas due on or before the report month", () => {
    const report = buildFinancingReport(ledger([], [1, 2]), 2026, 3);
    expect(report.financings[0].paidCount).toBe(2);
    expect(report.financings[0].outstandingBalance).toBe(10000);
  });

  it("marks the month's parcela paid when it is", () => {
    const report = buildFinancingReport(ledger([], [3]), 2026, 4);
    expect(report.financings[0].installmentPaid).toBe(true);
    expect(report.installmentRows[0].paid).toBe(true);
  });

  it("leaves out a loan settled before the report month", () => {
    // Paid off in full by an amortização in March; by June there is neither a
    // parcela nor a balance.
    const report = buildFinancingReport(
      ledger([extra("x1", "2026-03-01", 12000)]),
      2026,
      6
    );
    expect(report.financings).toEqual([]);
  });

  it("reports amortizações made inside the month as Despesa rows", () => {
    const report = buildFinancingReport(
      ledger([extra("x1", "2026-04-20", 500)]),
      2026,
      4
    );
    expect(report.extraRows).toEqual([
      {
        date: "2026-04-20",
        name: "Amortização — Apartamento",
        amount: 500,
        paid: true,
      },
    ]);
  });

  it("leaves amortizações from other months out of the fold rows", () => {
    const report = buildFinancingReport(
      ledger([extra("x1", "2026-03-20", 500)]),
      2026,
      4
    );
    expect(report.extraRows).toEqual([]);
  });

  it("reports progress as a percentage of the effective term", () => {
    const report = buildFinancingReport(ledger([], [1, 2, 3]), 2026, 4);
    expect(report.financings[0].totalInstallments).toBe(12);
    expect(report.financings[0].percentComplete).toBe(25);
  });

  it("reports a payoff date from the schedule as it stood that month", () => {
    expect(buildFinancingReport(ledger(), 2026, 4).financings[0].payoffDate).toBe(
      "2027-01-10"
    );
  });

  it("returns nothing for an empty ledger", () => {
    expect(buildFinancingReport([], 2026, 4)).toEqual({
      financings: [],
      installmentRows: [],
      extraRows: [],
    });
  });
});
