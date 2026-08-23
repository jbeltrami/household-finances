import { describe, expect, it } from "vitest";
import {
  isOverdue,
  summarizeOverdue,
  type MonthBill,
} from "../month-summary";

const TODAY = "2026-04-15";

// The projection is generic over the row: it filters and folds on the three
// fields every Obrigação has, and hands back whatever the caller gave it. The
// Aviso passes rows carrying a name; these tests pass the bare minimum plus a
// label, to prove the extra field survives the round trip.
type Row = MonthBill & { name: string };

const conta = (
  name: string,
  date: string,
  amount: number,
  paid = false
): Row => ({ name, date, amount, paid });

function ledger(overrides: {
  bills?: Row[];
  financingBills?: Row[];
  cutoff?: string;
}) {
  return {
    bills: overrides.bills ?? [],
    financing: { bills: overrides.financingBills ?? [] },
    cutoff: overrides.cutoff ?? TODAY,
  };
}

describe("isOverdue", () => {
  it("is true for an unpaid Obrigação whose date has passed", () => {
    expect(isOverdue({ date: "2026-04-10", amount: 470, paid: false }, TODAY))
      .toBe(true);
  });

  it("is false once it is paid", () => {
    expect(isOverdue({ date: "2026-04-10", amount: 470, paid: true }, TODAY))
      .toBe(false);
  });

  // The cutoff is the caller's question, not the predicate's. Saldo and the
  // calendar ask "as of today", where a Conta due today is money leaving
  // today. The Aviso asks "as of yesterday", because a Conta due today still
  // has the whole day to be paid and calling it late at 08:00 is a lie.
  it("counts an Obrigação due on the cutoff itself", () => {
    expect(isOverdue({ date: TODAY, amount: 470, paid: false }, TODAY))
      .toBe(true);
  });

  it("excludes an Obrigação due today when the cutoff is yesterday", () => {
    expect(
      isOverdue({ date: TODAY, amount: 470, paid: false }, "2026-04-14")
    ).toBe(false);
  });

  it("is false for an unpaid Obrigação still in the future", () => {
    expect(isOverdue({ date: "2026-04-20", amount: 470, paid: false }, TODAY))
      .toBe(false);
  });
});

describe("summarizeOverdue", () => {
  it("finds nothing in an empty month", () => {
    expect(summarizeOverdue(ledger({}))).toEqual({
      rows: [],
      count: 0,
      total: 0,
    });
  });

  it("finds nothing when every Conta is paid or still to come", () => {
    const summary = summarizeOverdue(
      ledger({
        bills: [
          conta("Claro", "2026-04-05", 470, true),
          conta("Unimed", "2026-04-20", 1200),
        ],
      })
    );
    expect(summary.count).toBe(0);
    expect(summary.total).toBe(0);
  });

  it("returns the Vencida Contas with the caller's own row shape intact", () => {
    const summary = summarizeOverdue(
      ledger({
        bills: [
          conta("Claro", "2026-04-05", 470),
          conta("Unimed", "2026-04-20", 1200),
        ],
      })
    );
    expect(summary.rows).toEqual([conta("Claro", "2026-04-05", 470)]);
    expect(summary.rows[0].name).toBe("Claro");
  });

  // The reason `financing` is a required field rather than an optional one:
  // a parcela is an Obrigação on exactly the same terms as a Conta.
  it("counts a parcela de Financiamento as Vencida on the same terms", () => {
    const summary = summarizeOverdue(
      ledger({
        financingBills: [conta("Apartamento 12/240", "2026-04-08", 3000)],
      })
    );
    expect(summary.count).toBe(1);
    expect(summary.total).toBe(3000);
  });

  it("reports a Conta and a parcela Vencidas on the same day together", () => {
    const summary = summarizeOverdue(
      ledger({
        bills: [conta("Claro", "2026-04-08", 470)],
        financingBills: [conta("Apartamento 12/240", "2026-04-08", 3000)],
      })
    );
    expect(summary.count).toBe(2);
    expect(summary.total).toBe(3470);
  });

  it("folds the figures from the rows it returns", () => {
    const summary = summarizeOverdue(
      ledger({
        bills: [
          conta("Claro", "2026-04-05", 470),
          conta("Condomínio", "2026-04-10", 1875),
          conta("Unimed", "2026-04-20", 1200),
        ],
        financingBills: [conta("Apartamento 12/240", "2026-04-08", 3000)],
      })
    );
    expect(summary.count).toBe(summary.rows.length);
    expect(summary.total).toBe(
      summary.rows.reduce((t, r) => t + r.amount, 0)
    );
    expect(summary.total).toBe(5345);
  });

  // Oldest first: the Aviso lists them in the order they fell due, so the
  // one that has been outstanding longest reads first.
  it("orders the rows by date, oldest first", () => {
    const summary = summarizeOverdue(
      ledger({
        bills: [
          conta("Condomínio", "2026-04-10", 1875),
          conta("Claro", "2026-04-05", 470),
        ],
        financingBills: [conta("Apartamento 12/240", "2026-04-08", 3000)],
      })
    );
    expect(summary.rows.map((r) => r.name)).toEqual([
      "Claro",
      "Apartamento 12/240",
      "Condomínio",
    ]);
  });
});
