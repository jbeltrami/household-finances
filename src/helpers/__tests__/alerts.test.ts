import { describe, expect, it } from "vitest";
import { buildAlertLedger } from "../alerts";
import { summarizeOverdue } from "../month-summary";
import type { ResolvedEntry } from "../types";
import type { MortgageBillItem } from "../financing";

const CUTOFF = "2026-04-14";

function entry(over: Partial<ResolvedEntry>): ResolvedEntry {
  return {
    id: "e1",
    space_id: "s1",
    template_id: "t1",
    date: "2026-04-05",
    name: "Claro",
    amount: 470,
    currency: "BRL",
    category: null,
    notes: null,
    paid: false,
    installments_covered: 1,
    installmentProgress: null,
    icon: null,
    ...over,
  };
}

function parcela(over: Partial<MortgageBillItem> = {}): MortgageBillItem {
  return {
    financingId: "f1",
    financingName: "Apartamento",
    installmentNumber: 12,
    installmentsTotal: 240,
    date: "2026-04-08",
    amount: 3000,
    paid: false,
    ...over,
  };
}

describe("buildAlertLedger", () => {
  it("carries the cutoff through so the caller's boundary is the one used", () => {
    expect(buildAlertLedger([], [], CUTOFF).cutoff).toBe(CUTOFF);
  });

  // An Aviso is about Obrigações. A Despesa records money already gone, so
  // it has no due date to miss and can never be Vencida — which in the
  // ledger means a one-off entry, the rows with no template behind them.
  it("keeps Contas and drops one-off Despesas", () => {
    const ledger = buildAlertLedger(
      [
        entry({ name: "Claro", template_id: "t1" }),
        entry({ id: "e2", name: "Padaria", template_id: null }),
      ],
      [],
      CUTOFF
    );
    expect(ledger.bills.map((b) => b.name)).toEqual(["Claro"]);
  });

  it("keeps a Conta that is still only a virtual occurrence", () => {
    const ledger = buildAlertLedger(
      [entry({ id: null, name: "Condomínio" })],
      [],
      CUTOFF
    );
    expect(ledger.bills.map((b) => b.name)).toEqual(["Condomínio"]);
  });

  it("carries a Conta's date, amount and paid state", () => {
    const ledger = buildAlertLedger(
      [entry({ date: "2026-04-05", amount: 470, paid: true })],
      [],
      CUTOFF
    );
    expect(ledger.bills[0]).toEqual({
      name: "Claro",
      date: "2026-04-05",
      amount: 470,
      paid: true,
    });
  });

  // A parcela has no name of its own — it is the nth payment of a loan — so
  // the Aviso has to build one, or the email reads as an unexplained amount.
  it("names a parcela after its Financiamento and its position in the term", () => {
    const ledger = buildAlertLedger([], [parcela()], CUTOFF);
    expect(ledger.financing.bills[0]).toEqual({
      name: "Apartamento — parcela 12/240",
      date: "2026-04-08",
      amount: 3000,
      paid: false,
    });
  });

  // The whole point of the required `financing` field: parcelas must land
  // where summarizeOverdue will look for them.
  it("puts parcelas where summarizeOverdue counts them", () => {
    const summary = summarizeOverdue(
      buildAlertLedger([entry({})], [parcela()], CUTOFF)
    );
    expect(summary.count).toBe(2);
    expect(summary.total).toBe(3470);
    expect(summary.rows.map((r) => r.name)).toEqual([
      "Claro",
      "Apartamento — parcela 12/240",
    ]);
  });

  it("leaves a paid parcela out of the summary", () => {
    const summary = summarizeOverdue(
      buildAlertLedger([], [parcela({ paid: true })], CUTOFF)
    );
    expect(summary.count).toBe(0);
  });

  // On the 1st, yesterday belongs to a month that has just locked. Every
  // Obrigação in the current month is dated after the cutoff, so the run
  // finds nothing without needing a month-boundary special case.
  it("finds nothing on the first of the month", () => {
    const summary = summarizeOverdue(
      buildAlertLedger(
        [entry({ date: "2026-05-01" })],
        [parcela({ date: "2026-05-10" })],
        "2026-04-30"
      )
    );
    expect(summary.count).toBe(0);
  });
});
