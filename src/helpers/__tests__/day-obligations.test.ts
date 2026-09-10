import { describe, expect, it } from "vitest";
import { summarizeDayObligations, type DayLedger } from "../month-summary";

const empty: DayLedger = {
  bills: [],
  financing: { bills: [] },
  day: 10,
};

function ledger(overrides: Partial<DayLedger>): DayLedger {
  return { ...empty, ...overrides };
}

const bill = (date: string, amount = 100, paid = false) => ({
  date,
  amount,
  paid,
});

describe("summarizeDayObligations", () => {
  it("owes nothing on a day with no Obrigação", () => {
    expect(summarizeDayObligations(empty)).toEqual({
      count: 0,
      total: 0,
      paid: 0,
      remaining: 0,
    });
  });

  it("sums the Contas due that day", () => {
    const d = summarizeDayObligations(
      ledger({ bills: [bill("2026-09-10", 340), bill("2026-09-10", 120)] })
    );
    expect(d).toEqual({ count: 2, total: 460, paid: 0, remaining: 460 });
  });

  it("counts a parcela de Financiamento as a Conta", () => {
    const d = summarizeDayObligations(
      ledger({ financing: { bills: [bill("2026-09-10", 1800)] } })
    );
    expect(d).toEqual({ count: 1, total: 1800, paid: 0, remaining: 1800 });
  });

  it("folds Contas and parcelas due the same day into one sum", () => {
    const d = summarizeDayObligations(
      ledger({
        bills: [bill("2026-09-10", 340)],
        financing: { bills: [bill("2026-09-10", 1800)] },
      })
    );
    expect(d).toEqual({ count: 2, total: 2140, paid: 0, remaining: 2140 });
  });

  it("ignores Obrigações due on other days", () => {
    const d = summarizeDayObligations(
      ledger({
        bills: [bill("2026-09-09", 50), bill("2026-09-11", 50)],
        financing: { bills: [bill("2026-09-30", 50)] },
      })
    );
    expect(d).toEqual({ count: 0, total: 0, paid: 0, remaining: 0 });
  });

  // The question is what falls due on the day, not what is still outstanding.
  it("counts an Obrigação that is already paid in the total", () => {
    const d = summarizeDayObligations(
      ledger({ bills: [bill("2026-09-10", 340, true)] })
    );
    expect(d).toEqual({ count: 1, total: 340, paid: 340, remaining: 0 });
  });

  it("splits the day between what is paid and what is still owed", () => {
    const d = summarizeDayObligations(
      ledger({
        bills: [bill("2026-09-10", 340, true), bill("2026-09-10", 120)],
        financing: { bills: [bill("2026-09-10", 1800)] },
      })
    );
    expect(d).toEqual({ count: 3, total: 2260, paid: 340, remaining: 1920 });
  });

  it("splits a paid parcela de Financiamento the same way as a Conta", () => {
    const d = summarizeDayObligations(
      ledger({ financing: { bills: [bill("2026-09-10", 1800, true)] } })
    );
    expect(d).toEqual({ count: 1, total: 1800, paid: 1800, remaining: 0 });
  });

  // Vencida is a cutoff question and this helper is given no cutoff, so an
  // unpaid Obrigação counts as still owed whether its date has passed or not.
  it("does not treat Vencida differently from merely unpaid", () => {
    const d = summarizeDayObligations(
      ledger({ day: 1, bills: [bill("2026-09-01", 500)] })
    );
    expect(d).toEqual({ count: 1, total: 500, paid: 0, remaining: 500 });
  });

  it("reads the day off the string, so a single-digit day does not match 1", () => {
    const d = summarizeDayObligations(
      ledger({ day: 1, bills: [bill("2026-09-10", 340)] })
    );
    expect(d).toEqual({ count: 0, total: 0, paid: 0, remaining: 0 });
  });

  it("skips a malformed date rather than counting it", () => {
    const d = summarizeDayObligations(ledger({ bills: [bill("nonsense", 99)] }));
    expect(d).toEqual({ count: 0, total: 0, paid: 0, remaining: 0 });
  });

  it("owes nothing on a day the month does not have", () => {
    const d = summarizeDayObligations(
      ledger({ day: 31, bills: [bill("2026-09-10", 340)] })
    );
    expect(d).toEqual({ count: 0, total: 0, paid: 0, remaining: 0 });
  });

  it("does not mutate the ledger it is given", () => {
    const l = ledger({ bills: [bill("2026-09-10", 340)] });
    const before = JSON.stringify(l);
    summarizeDayObligations(l);
    expect(JSON.stringify(l)).toBe(before);
  });
});
