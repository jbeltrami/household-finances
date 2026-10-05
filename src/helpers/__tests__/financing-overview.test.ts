import { describe, expect, it } from "vitest";
import {
  buildFinancingOverview,
  buildFinancingSchedule,
  buildSummary,
  type ExtraPaymentRow,
  type FinancingRow,
  type HydratedFinancing,
} from "../financing";
import type { ScheduleRow } from "../amortization";

// The overview reads today's date to decide which amortizações have already
// happened, as `buildSummary` does. Rather than injecting a clock, the
// fixtures sit far enough either side of any plausible "today" that the tests
// cannot rot: 2020 is unambiguously past, 2099 unambiguously future.
const PAST = "2020-06-15";
const FUTURE = "2099-06-15";

function financingRow(overrides: Partial<FinancingRow> = {}): FinancingRow {
  return {
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
    ...overrides,
  };
}

function extra(
  financingId: string,
  date: string,
  amount: number
): ExtraPaymentRow {
  return {
    id: `x-${financingId}-${date}`,
    financing_id: financingId,
    date,
    amount,
    effect: "reduce_term",
    notes: null,
  };
}

// A zero-interest schedule of `count` parcelas of `payment`, one a month from
// `firstYm` ("YYYY-MM"), so the arithmetic in each assertion is exact.
function rows(
  firstYm: string,
  count: number,
  payment: number,
  interest = 0
): ScheduleRow[] {
  const [y, m] = firstYm.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const abs = y * 12 + (m - 1) + i;
    const date = `${Math.floor(abs / 12)}-${String((abs % 12) + 1).padStart(2, "0")}-10`;
    return {
      number: i + 1,
      date,
      payment,
      interest,
      amortization: payment - interest,
      extraApplied: 0,
      balanceAfter: (count - i - 1) * (payment - interest),
    };
  });
}

function hydrated({
  id = "fin-1",
  name = "Apartamento",
  scheduleRows = rows("2020-01", 12, 1000),
  paid = [],
  extras = [],
}: {
  id?: string;
  name?: string;
  scheduleRows?: ScheduleRow[];
  paid?: number[];
  extras?: ExtraPaymentRow[];
} = {}): HydratedFinancing {
  const principal = scheduleRows.reduce((s, r) => s + r.amortization, 0);
  const interest = scheduleRows.reduce((s, r) => s + r.interest, 0);
  return {
    financing: financingRow({ id, name, principal }),
    extras,
    paidNumbers: new Set(paid),
    schedule: {
      rows: scheduleRows,
      totals: {
        paid: principal + interest,
        interest,
        principal,
        extra: 0,
      },
    },
  };
}

// Where a figure depends on how amortizações reshape a schedule, the loan is
// built by the engine rather than by hand: R$ 12.000 at 1% a month over
// twelve SAC parcelas, R$ 1.000 of principal each. With no amortização
// the interest is 1% of 12000 + 11000 + … + 1000, which is R$ 780.
function hydratedByEngine(
  id: string,
  startDate: string,
  extras: Omit<ExtraPaymentRow, "financing_id" | "id" | "notes">[] = []
): HydratedFinancing {
  const financing = financingRow({
    id,
    principal: 12000,
    interest_rate: 1,
    start_date: startDate,
  });
  const extraRows = extras.map((e, i) => ({
    ...e,
    id: `${id}-x${i}`,
    financing_id: id,
    notes: null,
  }));
  return {
    financing,
    extras: extraRows,
    paidNumbers: new Set(),
    schedule: buildFinancingSchedule(financing, extraRows),
  };
}

describe("buildFinancingOverview", () => {
  describe("Saldo devedor", () => {
    it("adds up the Saldo devedor each loan card shows", () => {
      const ledger = [
        hydrated({ id: "a", paid: [1, 2, 3] }),
        hydrated({
          id: "b",
          scheduleRows: rows("2099-01", 24, 500),
          extras: [extra("b", PAST, 1500)],
        }),
      ];
      const overview = buildFinancingOverview(ledger, 2020, 6);
      const perFinancing = ledger.map((h) => buildSummary(h).outstandingBalance);
      expect(perFinancing).toEqual([9000, 10500]);
      expect(overview.outstandingBalance).toBe(19500);
    });
  });

  describe("Total a pagar", () => {
    it("counts every parcela not marked paid, Vencidas included", () => {
      // Every 2020 parcela is long past, so 11 and 12 are Vencidas.
      const paid = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const overview = buildFinancingOverview([hydrated({ paid })], 2020, 6);
      expect(overview.totalToPay).toBe(2000);
    });

    it("adds an amortização dated in the future, which Saldo devedor leaves out", () => {
      const ledger = [
        hydrated({
          scheduleRows: rows("2099-01", 12, 1000),
          extras: [extra("fin-1", FUTURE, 3000)],
        }),
      ];
      const overview = buildFinancingOverview(ledger, 2020, 6);
      expect(overview.totalToPay).toBe(15000);
      expect(overview.outstandingBalance).toBe(12000);
    });

    it("does not add an amortização already made", () => {
      const ledger = [
        hydrated({
          scheduleRows: rows("2099-01", 12, 1000),
          extras: [extra("fin-1", PAST, 3000)],
        }),
      ];
      expect(buildFinancingOverview(ledger, 2020, 6).totalToPay).toBe(12000);
    });

    it("reports the interest inside it, from the unpaid parcelas only", () => {
      // Twelve parcelas of 1000, 100 of each interest; four paid.
      const ledger = [
        hydrated({
          scheduleRows: rows("2020-01", 12, 1000, 100),
          paid: [1, 2, 3, 4],
        }),
      ];
      const overview = buildFinancingOverview(ledger, 2020, 6);
      expect(overview.totalToPay).toBe(8000);
      expect(overview.interestToPay).toBe(800);
    });
  });

  describe("Parcelas deste mês", () => {
    it("counts the month's parcelas whether paid or not", () => {
      // Parcela 6 of each loan falls in June 2020; only one is paid.
      const ledger = [
        hydrated({ id: "a", paid: [1, 2, 3, 4, 5, 6] }),
        hydrated({
          id: "b",
          scheduleRows: rows("2020-01", 12, 400),
          paid: [1, 2, 3, 4, 5],
        }),
      ];
      expect(buildFinancingOverview(ledger, 2020, 6).installmentsThisMonth).toBe(
        1400
      );
    });

    it("leaves out a Vencida from an earlier month", () => {
      // Parcela 5 (May) is unpaid and Vencida; June's parcela is 6.
      const ledger = [hydrated({ paid: [1, 2, 3, 4] })];
      expect(buildFinancingOverview(ledger, 2020, 6).installmentsThisMonth).toBe(
        1000
      );
    });

    it("is zero in a month in which no loan has a parcela", () => {
      const ledger = [
        hydrated({ id: "a" }),
        hydrated({ id: "b", scheduleRows: rows("2099-01", 12, 400) }),
      ];
      expect(buildFinancingOverview(ledger, 2050, 6).installmentsThisMonth).toBe(
        0
      );
    });
  });

  describe("Quitação", () => {
    it("is the month of the latest last parcela across the loans", () => {
      const ledger = [
        hydrated({ id: "a", scheduleRows: rows("2099-01", 24, 500) }),
        hydrated({ id: "b", scheduleRows: rows("2098-03", 60, 200) }),
        hydrated({ id: "c" }),
      ];
      // b ends 59 months after March 2098: February 2103.
      expect(buildFinancingOverview(ledger, 2020, 6).payoffMonth).toBe(
        "2103-02"
      );
    });

    it("still names a month while one loan has a parcela unpaid", () => {
      const all = Array.from({ length: 12 }, (_, i) => i + 1);
      const ledger = [
        hydrated({ id: "a", paid: all }),
        hydrated({ id: "b", paid: all.slice(0, 11) }),
      ];
      expect(buildFinancingOverview(ledger, 2020, 6).payoffMonth).toBe(
        "2020-12"
      );
    });

    it("reports the loans settled once every parcela is marked paid", () => {
      const all = Array.from({ length: 12 }, (_, i) => i + 1);
      const ledger = [
        hydrated({ id: "a", paid: all }),
        hydrated({ id: "b", paid: all }),
      ];
      expect(buildFinancingOverview(ledger, 2020, 6).payoffMonth).toBeNull();
    });
  });

  describe("Economia com amortizações", () => {
    // R$ 6.000 paid with the first parcela leaves R$ 5.000. Shortening the
    // term, it is gone five parcelas later, after interest of 120 on the
    // first and 50 + 40 + 30 + 20 + 10 on the rest: R$ 270.
    const reduceTerm = { amount: 6000, effect: "reduce_term" as const };

    it("is zero, and says no amortização exists, when there is none", () => {
      const savings = buildFinancingOverview(
        [hydratedByEngine("a", "2020-01-10")],
        2020,
        6
      ).savings;
      expect(savings).toEqual({
        hasExtras: false,
        interestSaved: 0,
        installmentsRemoved: 0,
      });
    });

    it("counts the interest and parcelas a reduce-term amortização removed", () => {
      const ledger = [
        hydratedByEngine("a", "2020-01-10", [{ ...reduceTerm, date: "2020-01-10" }]),
      ];
      expect(buildFinancingOverview(ledger, 2020, 6).savings).toEqual({
        hasExtras: true,
        interestSaved: 510,
        installmentsRemoved: 6,
      });
    });

    it("counts the interest but no parcelas when every amortização lowered the parcela", () => {
      // The R$ 5.000 left is spread over the eleven parcelas still due, so
      // the interest after the first is 1% of 5000 × (11 + 10 + … + 1) / 11,
      // which is R$ 300: R$ 420 in all, R$ 360 less than without it.
      const ledger = [
        hydratedByEngine("a", "2020-01-10", [
          { amount: 6000, effect: "reduce_installment", date: "2020-01-10" },
        ]),
      ];
      const { savings } = buildFinancingOverview(ledger, 2020, 6);
      expect(savings.hasExtras).toBe(true);
      expect(savings.interestSaved).toBeCloseTo(360, 2);
      expect(savings.installmentsRemoved).toBe(0);
    });

    it("counts an amortização recorded for a future date", () => {
      const ledger = [
        hydratedByEngine("a", "2099-01-10", [{ ...reduceTerm, date: "2099-01-10" }]),
      ];
      expect(buildFinancingOverview(ledger, 2020, 6).savings).toEqual({
        hasExtras: true,
        interestSaved: 510,
        installmentsRemoved: 6,
      });
    });

    it("adds up the savings across loans", () => {
      const ledger = [
        hydratedByEngine("a", "2020-01-10", [{ ...reduceTerm, date: "2020-01-10" }]),
        hydratedByEngine("b", "2099-01-10", [{ ...reduceTerm, date: "2099-01-10" }]),
        hydratedByEngine("c", "2020-01-10"),
      ];
      expect(buildFinancingOverview(ledger, 2020, 6).savings).toEqual({
        hasExtras: true,
        interestSaved: 1020,
        installmentsRemoved: 12,
      });
    });
  });

  describe("chart series", () => {
    it("runs from the earliest first parcela to the latest last parcela", () => {
      const ledger = [
        hydrated({ id: "a", scheduleRows: rows("2020-03", 3, 100) }),
        hydrated({ id: "b", scheduleRows: rows("2020-01", 2, 100) }),
      ];
      const { months } = buildFinancingOverview(ledger, 2020, 6).series;
      expect(months.map((m) => m.month)).toEqual([
        "2020-01",
        "2020-02",
        "2020-03",
        "2020-04",
        "2020-05",
      ]);
    });

    it("holds each loan's balance and parcela, and nothing outside its own schedule", () => {
      const ledger = [
        hydrated({ id: "a", scheduleRows: rows("2020-03", 3, 100) }),
        hydrated({ id: "b", scheduleRows: rows("2020-01", 2, 250) }),
      ];
      const { months } = buildFinancingOverview(ledger, 2020, 6).series;
      expect(months.map((m) => m.byFinancing)).toEqual([
        { b: { balance: 250, payment: 250 } },
        { b: { balance: 0, payment: 250 } },
        { a: { balance: 200, payment: 100 } },
        { a: { balance: 100, payment: 100 } },
        { a: { balance: 0, payment: 100 } },
      ]);
    });

    it("leaves a month in which no loan has a parcela empty", () => {
      const ledger = [
        hydrated({ id: "a", scheduleRows: rows("2020-01", 1, 100) }),
        hydrated({ id: "b", scheduleRows: rows("2020-03", 1, 100) }),
      ];
      const { months } = buildFinancingOverview(ledger, 2020, 6).series;
      expect(months).toEqual([
        { month: "2020-01", byFinancing: { a: { balance: 0, payment: 100 } } },
        { month: "2020-02", byFinancing: {} },
        { month: "2020-03", byFinancing: { b: { balance: 0, payment: 100 } } },
      ]);
    });

    it("draws the plan, with an amortização recorded for a future date", () => {
      // R$ 6.000 with the first parcela, shortening the term: R$ 5.000 left
      // after January, gone by June instead of December.
      const ledger = [
        hydratedByEngine("a", "2099-01-10", [
          { amount: 6000, effect: "reduce_term", date: "2099-01-10" },
        ]),
      ];
      const { months } = buildFinancingOverview(ledger, 2020, 6).series;
      expect(months.map((m) => m.month)).toEqual([
        "2099-01",
        "2099-02",
        "2099-03",
        "2099-04",
        "2099-05",
        "2099-06",
      ]);
      expect(months.map((m) => m.byFinancing.a.balance)).toEqual([
        5000, 4000, 3000, 2000, 1000, 0,
      ]);
    });

    it("names the loans in ledger order", () => {
      const ledger = [
        hydrated({ id: "b", name: "Carro", scheduleRows: rows("2099-01", 2, 100) }),
        hydrated({ id: "a", name: "Apartamento" }),
      ];
      expect(buildFinancingOverview(ledger, 2020, 6).series.financings).toEqual([
        { id: "b", name: "Carro" },
        { id: "a", name: "Apartamento" },
      ]);
    });

    it("is empty for an empty ledger", () => {
      expect(buildFinancingOverview([], 2020, 6).series).toEqual({
        financings: [],
        months: [],
      });
    });
  });

  it("adds nothing for a loan whose every parcela is paid", () => {
    const all = Array.from({ length: 12 }, (_, i) => i + 1);
    const ledger = [
      hydrated({ id: "a", paid: all }),
      hydrated({ id: "b", scheduleRows: rows("2099-01", 3, 700, 50) }),
    ];
    const overview = buildFinancingOverview(ledger, 2020, 6);
    expect(overview.outstandingBalance).toBe(1950);
    expect(overview.totalToPay).toBe(2100);
    expect(overview.interestToPay).toBe(150);
    // Still drawn: paying a loan off is history, not missing data.
    expect(overview.series.financings.map((l) => l.id)).toEqual(["a", "b"]);
    expect(overview.series.months[0]).toEqual({
      month: "2020-01",
      byFinancing: { a: { balance: 11000, payment: 1000 } },
    });
  });

  it("reports zeros for an empty ledger", () => {
    const overview = buildFinancingOverview([], 2020, 6);
    expect(overview.outstandingBalance).toBe(0);
    expect(overview.totalToPay).toBe(0);
    expect(overview.interestToPay).toBe(0);
  });
});
