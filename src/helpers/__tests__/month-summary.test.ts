import { describe, expect, it } from "vitest";
import { summarizeMonth, type MonthLedger } from "../month-summary";

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

const bill = (date: string, amount: number, paid = false) => ({
  date,
  amount,
  paid,
});

// Despesas and Receitas carry dates for the day markers; the totals do not
// look at them, so tests about totals leave them at a default.
const expense = (amount: number, date = "2026-04-12") => ({ date, amount });
const income = (
  amount: number,
  received: boolean,
  expected_date = "2026-04-05"
) => ({ expected_date, amount, received });

describe("summarizeMonth", () => {
  describe("Contas", () => {
    it("is all zeroes for an empty month", () => {
      const totals = summarizeMonth(empty);
      expect(totals.bills).toEqual({ total: 0, paid: 0, remaining: 0 });
      expect(totals.balance).toEqual({ netExpected: 0, netSoFar: 0 });
    });

    it("totals every Conta, paid or not", () => {
      const totals = summarizeMonth(
        ledger({ bills: [bill("2026-04-05", 470, true), bill("2026-04-20", 1200)] })
      );
      expect(totals.bills.total).toBe(1670);
      expect(totals.bills.paid).toBe(470);
      expect(totals.bills.remaining).toBe(1200);
    });

    it("counts a parcela de Financiamento as a Conta", () => {
      const totals = summarizeMonth(
        ledger({
          bills: [bill("2026-04-05", 470, true)],
          financing: { bills: [bill("2026-04-10", 3000, true)], expenses: [] },
        })
      );
      expect(totals.bills.total).toBe(3470);
      expect(totals.bills.paid).toBe(3470);
      expect(totals.bills.remaining).toBe(0);
    });
  });

  describe("Receitas", () => {
    it("splits expected from received", () => {
      const totals = summarizeMonth(
        ledger({
          income: [
            income(19000, true),
            income(2000, false),
          ],
        })
      );
      expect(totals.income).toEqual({
        total: 21000,
        received: 19000,
        stillExpected: 2000,
      });
    });
  });

  describe("Despesas", () => {
    it("totals one-off spending", () => {
      const totals = summarizeMonth(
        ledger({ expenses: [expense(120), expense(80)] })
      );
      expect(totals.expenses.total).toBe(200);
    });

    it("counts an amortização extraordinária as a Despesa", () => {
      const totals = summarizeMonth(
        ledger({
          expenses: [expense(120)],
          financing: { bills: [], expenses: [expense(5000)] },
        })
      );
      expect(totals.expenses.total).toBe(5120);
    });
  });

  describe("Saldo esperado", () => {
    it("is the whole month as planned, settled or not", () => {
      const totals = summarizeMonth(
        ledger({
          income: [income(21000, false)],
          bills: [bill("2026-04-20", 12000)],
          expenses: [expense(1000)],
        })
      );
      expect(totals.balance.netExpected).toBe(8000);
    });

    it("counts Financiamento on both sides", () => {
      const totals = summarizeMonth(
        ledger({
          income: [income(21000, false)],
          financing: {
            bills: [bill("2026-04-10", 3000)],
            expenses: [expense(2000)],
          },
        })
      );
      expect(totals.balance.netExpected).toBe(16000);
    });
  });

  describe("Saldo até o momento", () => {
    it("counts only Receitas actually received", () => {
      const totals = summarizeMonth(
        ledger({
          income: [
            income(19000, true),
            income(2000, false),
          ],
        })
      );
      expect(totals.balance.netSoFar).toBe(19000);
    });

    it("subtracts a Conta that was paid", () => {
      const totals = summarizeMonth(
        ledger({
          income: [income(1000, true)],
          bills: [bill("2026-04-20", 300, true)],
        })
      );
      expect(totals.balance.netSoFar).toBe(700);
    });

    it("subtracts a Conta that is overdue and unpaid", () => {
      const totals = summarizeMonth(
        ledger({
          income: [income(1000, true)],
          bills: [bill("2026-04-10", 300)],
        })
      );
      expect(totals.balance.netSoFar).toBe(700);
    });

    it("treats a Conta due today as already gone", () => {
      const totals = summarizeMonth(
        ledger({
          income: [income(1000, true)],
          bills: [bill(TODAY, 300)],
        })
      );
      expect(totals.balance.netSoFar).toBe(700);
    });

    it("leaves a future unpaid Conta alone", () => {
      const totals = summarizeMonth(
        ledger({
          income: [income(1000, true)],
          bills: [bill("2026-04-20", 300)],
        })
      );
      expect(totals.balance.netSoFar).toBe(1000);
    });

    it("does not subtract a paid future-dated Conta twice", () => {
      // Paid AND future: it belongs to the paid filter, not the overdue one.
      const totals = summarizeMonth(
        ledger({
          income: [income(1000, true)],
          bills: [bill("2026-04-20", 300, true)],
        })
      );
      expect(totals.balance.netSoFar).toBe(700);
    });

    it("does not subtract a paid past-dated Conta twice", () => {
      const totals = summarizeMonth(
        ledger({
          income: [income(1000, true)],
          bills: [bill("2026-04-01", 300, true)],
        })
      );
      expect(totals.balance.netSoFar).toBe(700);
    });

    it("subtracts every Despesa, which is money already gone", () => {
      const totals = summarizeMonth(
        ledger({
          income: [income(1000, true)],
          expenses: [expense(250)],
        })
      );
      expect(totals.balance.netSoFar).toBe(750);
    });

    it("applies the overdue rule to an unpaid parcela too", () => {
      const totals = summarizeMonth(
        ledger({
          income: [income(5000, true)],
          financing: { bills: [bill("2026-04-10", 3000)], expenses: [] },
        })
      );
      expect(totals.balance.netSoFar).toBe(2000);
    });

    it("puts the whole month together", () => {
      const totals = summarizeMonth(
        ledger({
          income: [
            income(19000, true),
            income(2000, false),
          ],
          bills: [
            bill("2026-04-05", 470, true),
            bill("2026-04-10", 1200),
            bill("2026-04-25", 1875),
          ],
          expenses: [expense(300)],
          financing: {
            bills: [bill("2026-04-08", 3000, true)],
            expenses: [expense(1000)],
          },
        })
      );
      expect(totals.bills).toEqual({ total: 6545, paid: 3470, remaining: 3075 });
      expect(totals.expenses.total).toBe(1300);
      expect(totals.income.total).toBe(21000);
      // 21000 - 6545 - 1300
      expect(totals.balance.netExpected).toBe(13155);
      // 19000 received - 3470 paid - 1200 overdue - 1300 despesas
      expect(totals.balance.netSoFar).toBe(13030);
    });
  });

  it("does not mutate the ledger it was given", () => {
    const bills = [bill("2026-04-05", 470, true)];
    const input = ledger({
      bills,
      financing: { bills: [bill("2026-04-10", 3000)], expenses: [] },
    });
    summarizeMonth(input);
    expect(bills).toHaveLength(1);
    expect(input.bills).toHaveLength(1);
  });
});
