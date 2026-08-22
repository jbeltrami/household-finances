import { describe, expect, it } from "vitest";
import { buildMonthItems, type HydratedFinancing } from "../financing";
import type { ScheduleRow } from "../amortization";

function scheduleRow(
  number: number,
  date: string,
  payment: number
): ScheduleRow {
  return {
    number,
    date,
    payment,
    interest: 0,
    amortization: payment,
    extraApplied: 0,
    balanceAfter: 0,
  };
}

// A Financiamento with a three-parcela schedule running Feb–Apr 2026.
function hydrated(
  overrides: Partial<HydratedFinancing> = {}
): HydratedFinancing {
  return {
    financing: {
      id: "fin-1",
      space_id: "space-1",
      category_id: "cat-moradia",
      name: "Apartamento",
      principal: 3000,
      interest_rate: 0,
      rate_period: "monthly",
      amortization_system: "sac",
      start_date: "2026-02-10",
      installments_total: 3,
      active: true,
      created_at: "2026-01-01T00:00:00Z",
    },
    extras: [],
    paidNumbers: new Set<number>(),
    schedule: {
      rows: [
        scheduleRow(1, "2026-02-10", 1000),
        scheduleRow(2, "2026-03-10", 1000),
        scheduleRow(3, "2026-04-10", 1000),
      ],
      totals: { paid: 3000, interest: 0, principal: 3000, extra: 0 },
    },
    ...overrides,
  };
}

function extra(id: string, date: string, amount: number) {
  return {
    id,
    financing_id: "fin-1",
    date,
    amount,
    effect: "reduce_term" as const,
    notes: null,
  };
}

describe("buildMonthItems", () => {
  it("surfaces the parcela falling in the month as a Conta", () => {
    const { bills } = buildMonthItems([hydrated()], 2026, 3);
    expect(bills).toHaveLength(1);
    expect(bills[0]).toMatchObject({
      financingName: "Apartamento",
      installmentNumber: 2,
      installmentsTotal: 3,
      date: "2026-03-10",
      amount: 1000,
      paid: false,
    });
  });

  it("marks the parcela paid when it is recorded as paid", () => {
    const ledger = [hydrated({ paidNumbers: new Set([2]) })];
    expect(buildMonthItems(ledger, 2026, 3).bills[0].paid).toBe(true);
    expect(buildMonthItems(ledger, 2026, 4).bills[0].paid).toBe(false);
  });

  it("contributes nothing for a month before the loan begins", () => {
    expect(buildMonthItems([hydrated()], 2026, 1)).toEqual({
      bills: [],
      expenses: [],
    });
  });

  it("contributes nothing for a month after the loan is settled", () => {
    expect(buildMonthItems([hydrated()], 2026, 5)).toEqual({
      bills: [],
      expenses: [],
    });
  });

  it("surfaces an amortização dated inside the month as a Despesa", () => {
    const ledger = [hydrated({ extras: [extra("x1", "2026-03-20", 500)] })];
    const { expenses } = buildMonthItems(ledger, 2026, 3);
    expect(expenses).toHaveLength(1);
    expect(expenses[0]).toMatchObject({
      id: "x1",
      financingName: "Apartamento",
      date: "2026-03-20",
      amount: 500,
    });
  });

  it("leaves out an amortização dated outside the month, at either end", () => {
    const ledger = [
      hydrated({
        extras: [extra("x1", "2026-02-28", 500), extra("x2", "2026-04-01", 500)],
      }),
    ];
    expect(buildMonthItems(ledger, 2026, 3).expenses).toEqual([]);
  });

  it("includes amortizações dated on the first and last day of the month", () => {
    const ledger = [
      hydrated({
        extras: [extra("x1", "2026-03-01", 100), extra("x2", "2026-03-31", 200)],
      }),
    ];
    expect(buildMonthItems(ledger, 2026, 3).expenses.map((e) => e.id)).toEqual([
      "x1",
      "x2",
    ]);
  });

  it("respects the real last day of a short month", () => {
    const ledger = [hydrated({ extras: [extra("x1", "2026-02-28", 100)] })];
    expect(buildMonthItems(ledger, 2026, 2).expenses).toHaveLength(1);
  });

  it("surfaces an amortização in a month with no parcela of its own", () => {
    const ledger = [hydrated({ extras: [extra("x1", "2026-05-05", 900)] })];
    const { bills, expenses } = buildMonthItems(ledger, 2026, 5);
    expect(bills).toEqual([]);
    expect(expenses).toHaveLength(1);
  });

  it("carries the amount the schedule computed, extras and all", () => {
    // A schedule shortened by an extra: two parcelas, the second smaller.
    const ledger = [
      hydrated({
        schedule: {
          rows: [
            scheduleRow(1, "2026-02-10", 1000),
            scheduleRow(2, "2026-03-10", 420.55),
          ],
          totals: { paid: 1420.55, interest: 0, principal: 3000, extra: 1579.45 },
        },
      }),
    ];
    const { bills } = buildMonthItems(ledger, 2026, 3);
    expect(bills[0].amount).toBe(420.55);
    expect(bills[0].installmentsTotal).toBe(2);
  });

  it("folds several Financiamentos into one set of items", () => {
    const second = hydrated({
      financing: { ...hydrated().financing, id: "fin-2", name: "Carro" },
      extras: [{ ...extra("x9", "2026-03-15", 300), financing_id: "fin-2" }],
    });
    const { bills, expenses } = buildMonthItems([hydrated(), second], 2026, 3);
    expect(bills.map((b) => b.financingName)).toEqual([
      "Apartamento",
      "Carro",
    ]);
    expect(expenses.map((e) => e.financingId)).toEqual(["fin-2"]);
  });

  it("returns nothing for an empty ledger", () => {
    expect(buildMonthItems([], 2026, 3)).toEqual({ bills: [], expenses: [] });
  });
});
