import { describe, expect, it } from "vitest";
import { monthDayMarkers, type MonthLedger } from "../month-summary";

const TODAY = "2026-04-15";

const empty: MonthLedger = {
  bills: [],
  expenses: [],
  income: [],
  financing: { bills: [], expenses: [] },
  today: TODAY,
};

function ledger(overrides: Partial<MonthLedger>): MonthLedger {
  return { ...empty, ...overrides };
}

const bill = (date: string, paid = false) => ({ date, amount: 100, paid });
const expense = (date: string) => ({ date, amount: 100 });
const income = (expected_date: string) => ({
  expected_date,
  amount: 100,
  received: false,
});

describe("monthDayMarkers", () => {
  it("marks no days for an empty month", () => {
    expect(monthDayMarkers(empty)).toEqual({
      daysWithBills: [],
      daysWithOverdueBills: [],
      daysWithIncome: [],
      daysWithExpenses: [],
    });
  });

  it("marks the day a Conta falls on", () => {
    const m = monthDayMarkers(ledger({ bills: [bill("2026-04-20")] }));
    expect(m.daysWithBills).toEqual([20]);
  });

  it("marks the day a parcela de Financiamento falls on", () => {
    const m = monthDayMarkers(
      ledger({ financing: { bills: [bill("2026-04-10")], expenses: [] } })
    );
    expect(m.daysWithBills).toEqual([10]);
  });

  it("marks the day an amortização falls on as a Despesa", () => {
    const m = monthDayMarkers(
      ledger({ financing: { bills: [], expenses: [expense("2026-04-07")] } })
    );
    expect(m.daysWithExpenses).toEqual([7]);
  });

  it("marks the day a Receita is expected", () => {
    const m = monthDayMarkers(ledger({ income: [income("2026-04-05")] }));
    expect(m.daysWithIncome).toEqual([5]);
  });

  describe("overdue", () => {
    it("marks a Conta due before today and unpaid", () => {
      const m = monthDayMarkers(ledger({ bills: [bill("2026-04-10")] }));
      expect(m.daysWithOverdueBills).toEqual([10]);
    });

    it("marks a Conta due today and unpaid", () => {
      const m = monthDayMarkers(ledger({ bills: [bill(TODAY)] }));
      expect(m.daysWithOverdueBills).toEqual([15]);
    });

    it("leaves a Conta due after today alone", () => {
      const m = monthDayMarkers(ledger({ bills: [bill("2026-04-16")] }));
      expect(m.daysWithBills).toEqual([16]);
      expect(m.daysWithOverdueBills).toEqual([]);
    });

    it("leaves a past Conta that was paid alone", () => {
      const m = monthDayMarkers(ledger({ bills: [bill("2026-04-10", true)] }));
      expect(m.daysWithBills).toEqual([10]);
      expect(m.daysWithOverdueBills).toEqual([]);
    });

    it("marks an unpaid parcela de Financiamento overdue", () => {
      const m = monthDayMarkers(
        ledger({ financing: { bills: [bill("2026-04-01")], expenses: [] } })
      );
      expect(m.daysWithOverdueBills).toEqual([1]);
    });

    it("never marks a day overdue because of a Despesa", () => {
      const m = monthDayMarkers(
        ledger({
          expenses: [expense("2026-04-01")],
          financing: { bills: [], expenses: [expense("2026-04-02")] },
        })
      );
      expect(m.daysWithExpenses).toEqual([1, 2]);
      expect(m.daysWithOverdueBills).toEqual([]);
    });

    it("never marks a day overdue because of an unreceived Receita", () => {
      const m = monthDayMarkers(ledger({ income: [income("2026-04-01")] }));
      expect(m.daysWithOverdueBills).toEqual([]);
    });

    it("marks a day overdue when any one Conta on it is", () => {
      const m = monthDayMarkers(
        ledger({ bills: [bill("2026-04-10", true), bill("2026-04-10")] })
      );
      expect(m.daysWithBills).toEqual([10]);
      expect(m.daysWithOverdueBills).toEqual([10]);
    });
  });

  it("returns each day once, ascending", () => {
    const m = monthDayMarkers(
      ledger({
        bills: [bill("2026-04-20"), bill("2026-04-03"), bill("2026-04-20")],
      })
    );
    expect(m.daysWithBills).toEqual([3, 20]);
  });

  it("reads the day off the string rather than parsing a Date", () => {
    // The first of the month is where UTC-midnight parsing would slip back
    // to the previous day in a negative-offset timezone.
    const m = monthDayMarkers(ledger({ bills: [bill("2026-04-01")] }));
    expect(m.daysWithBills).toEqual([1]);
  });

  it("skips a malformed date rather than marking day NaN", () => {
    const m = monthDayMarkers(
      ledger({ bills: [{ date: "nonsense", amount: 100, paid: false }] })
    );
    expect(m.daysWithBills).toEqual([]);
  });
});
