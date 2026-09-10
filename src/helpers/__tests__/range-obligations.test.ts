import { describe, expect, it } from "vitest";
import {
  summarizeRangeObligations,
  type RangeLedger,
} from "../month-summary";

const empty: RangeLedger = {
  bills: [],
  financing: { bills: [] },
  range: { from: 10, to: 10 },
};

function ledger(overrides: Partial<RangeLedger>): RangeLedger {
  return { ...empty, ...overrides };
}

const bill = (date: string, amount = 100, paid = false) => ({
  date,
  amount,
  paid,
});

// A Período whose ends coincide is a single day, so these are the same cases
// the single-day fold was tested against, unchanged apart from their shape.
describe("summarizeRangeObligations over a Período of one day", () => {
  it("owes nothing on a day with no Obrigação", () => {
    expect(summarizeRangeObligations(empty)).toEqual({
      count: 0,
      total: 0,
      paid: 0,
      remaining: 0,
    });
  });

  it("sums the Contas due that day", () => {
    const d = summarizeRangeObligations(
      ledger({ bills: [bill("2026-09-10", 340), bill("2026-09-10", 120)] })
    );
    expect(d).toEqual({ count: 2, total: 460, paid: 0, remaining: 460 });
  });

  it("counts a parcela de Financiamento as a Conta", () => {
    const d = summarizeRangeObligations(
      ledger({ financing: { bills: [bill("2026-09-10", 1800)] } })
    );
    expect(d).toEqual({ count: 1, total: 1800, paid: 0, remaining: 1800 });
  });

  it("folds Contas and parcelas due the same day into one sum", () => {
    const d = summarizeRangeObligations(
      ledger({
        bills: [bill("2026-09-10", 340)],
        financing: { bills: [bill("2026-09-10", 1800)] },
      })
    );
    expect(d).toEqual({ count: 2, total: 2140, paid: 0, remaining: 2140 });
  });

  it("ignores Obrigações due on other days", () => {
    const d = summarizeRangeObligations(
      ledger({
        bills: [bill("2026-09-09", 50), bill("2026-09-11", 50)],
        financing: { bills: [bill("2026-09-30", 50)] },
      })
    );
    expect(d).toEqual({ count: 0, total: 0, paid: 0, remaining: 0 });
  });

  // The question is what falls due in the Período, not what is still
  // outstanding.
  it("counts an Obrigação that is already paid in the total", () => {
    const d = summarizeRangeObligations(
      ledger({ bills: [bill("2026-09-10", 340, true)] })
    );
    expect(d).toEqual({ count: 1, total: 340, paid: 340, remaining: 0 });
  });

  it("splits the day between what is paid and what is still owed", () => {
    const d = summarizeRangeObligations(
      ledger({
        bills: [bill("2026-09-10", 340, true), bill("2026-09-10", 120)],
        financing: { bills: [bill("2026-09-10", 1800)] },
      })
    );
    expect(d).toEqual({ count: 3, total: 2260, paid: 340, remaining: 1920 });
  });

  it("splits a paid parcela de Financiamento the same way as a Conta", () => {
    const d = summarizeRangeObligations(
      ledger({ financing: { bills: [bill("2026-09-10", 1800, true)] } })
    );
    expect(d).toEqual({ count: 1, total: 1800, paid: 1800, remaining: 0 });
  });

  // Vencida is a cutoff question and this helper is given no cutoff, so an
  // unpaid Obrigação counts as still owed whether its date has passed or not.
  it("does not treat Vencida differently from merely unpaid", () => {
    const d = summarizeRangeObligations(
      ledger({ range: { from: 1, to: 1 }, bills: [bill("2026-09-01", 500)] })
    );
    expect(d).toEqual({ count: 1, total: 500, paid: 0, remaining: 500 });
  });

  it("reads the day off the string, so a single-digit day does not match 1", () => {
    const d = summarizeRangeObligations(
      ledger({ range: { from: 1, to: 1 }, bills: [bill("2026-09-10", 340)] })
    );
    expect(d).toEqual({ count: 0, total: 0, paid: 0, remaining: 0 });
  });

  it("skips a malformed date rather than counting it", () => {
    const d = summarizeRangeObligations(
      ledger({ bills: [bill("nonsense", 99)] })
    );
    expect(d).toEqual({ count: 0, total: 0, paid: 0, remaining: 0 });
  });

  it("owes nothing on a day the month does not have", () => {
    const d = summarizeRangeObligations(
      ledger({ range: { from: 31, to: 31 }, bills: [bill("2026-09-10", 340)] })
    );
    expect(d).toEqual({ count: 0, total: 0, paid: 0, remaining: 0 });
  });

  it("does not mutate the ledger it is given", () => {
    const l = ledger({ bills: [bill("2026-09-10", 340)] });
    const before = JSON.stringify(l);
    summarizeRangeObligations(l);
    expect(JSON.stringify(l)).toBe(before);
  });
});

describe("summarizeRangeObligations over a span", () => {
  it("counts the Obrigações on both ends", () => {
    const d = summarizeRangeObligations(
      ledger({
        range: { from: 10, to: 15 },
        bills: [bill("2026-09-10", 340), bill("2026-09-15", 120)],
      })
    );
    expect(d).toEqual({ count: 2, total: 460, paid: 0, remaining: 460 });
  });

  it("counts the Obrigações between the ends as well", () => {
    const d = summarizeRangeObligations(
      ledger({
        range: { from: 10, to: 15 },
        bills: [bill("2026-09-12", 340)],
        financing: { bills: [bill("2026-09-13", 1800)] },
      })
    );
    expect(d).toEqual({ count: 2, total: 2140, paid: 0, remaining: 2140 });
  });

  it("leaves out the days either side of the span", () => {
    const d = summarizeRangeObligations(
      ledger({
        range: { from: 10, to: 15 },
        bills: [bill("2026-09-09", 50), bill("2026-09-16", 50)],
      })
    );
    expect(d).toEqual({ count: 0, total: 0, paid: 0, remaining: 0 });
  });

  it("owes nothing over a span with nothing due in it", () => {
    const d = summarizeRangeObligations(
      ledger({
        range: { from: 2, to: 8 },
        bills: [bill("2026-09-10", 340)],
        financing: { bills: [bill("2026-09-20", 1800)] },
      })
    );
    expect(d).toEqual({ count: 0, total: 0, paid: 0, remaining: 0 });
  });

  it("splits a span between what is paid and what is still owed", () => {
    const d = summarizeRangeObligations(
      ledger({
        range: { from: 10, to: 15 },
        bills: [bill("2026-09-10", 340, true), bill("2026-09-14", 120)],
        financing: { bills: [bill("2026-09-15", 1800, true)] },
      })
    );
    expect(d).toEqual({ count: 3, total: 2260, paid: 2140, remaining: 120 });
  });

  // The whole month is a legitimate Período, and it restates the Contas
  // card's own figure rather than being capped or suppressed.
  it("restates the month's own figure over a span covering it", () => {
    const d = summarizeRangeObligations(
      ledger({
        range: { from: 1, to: 30 },
        bills: [bill("2026-09-01", 340), bill("2026-09-30", 120)],
        financing: { bills: [bill("2026-09-15", 1800)] },
      })
    );
    expect(d).toEqual({ count: 3, total: 2260, paid: 0, remaining: 2260 });
  });
});
