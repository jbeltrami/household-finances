import { describe, expect, it } from "vitest";
import { expandTemplateForMonth, installmentWindow } from "../ledger";
import { dayOfMonthFromYmd } from "../date";
import type { TemplateRecurrence } from "../types";

// A Conta recorrente with no parcelamento, as the monthly cadence path
// wants it. Individual tests override only what they are about.
function template(
  overrides: Partial<TemplateRecurrence> = {}
): TemplateRecurrence {
  return {
    id: "tpl-1",
    space_id: "space-1",
    name: "Claro",
    default_amount: 470,
    currency: "BRL",
    category_id: null,
    icon: null,
    cadence: "monthly",
    due_day: 10,
    day_of_week: null,
    biweekly_anchor: null,
    installments_total: null,
    installments_start_month: null,
    ...overrides,
  };
}

// A parcelamento in `total` parcelas starting in January 2026.
function parcelado(total: number, startMonth = "2026-01-01") {
  return template({
    installments_total: total,
    installments_start_month: startMonth,
  });
}

describe("installmentWindow", () => {
  it("is unbounded for a Conta with no parcelamento", () => {
    expect(installmentWindow(template(), 0, 0)).toEqual({ kind: "unbounded" });
  });

  it("is unbounded regardless of paid coverage, which cannot apply", () => {
    expect(installmentWindow(template(), 5, 3)).toEqual({ kind: "unbounded" });
  });

  it("is empty for a parcelamento with no start month", () => {
    const tpl = template({ installments_total: 12 });
    expect(installmentWindow(tpl, 0, 0)).toEqual({ kind: "empty" });
  });

  it("spans exactly 12 months for a 12x series with no prepayment", () => {
    expect(installmentWindow(parcelado(12), 0, 0)).toEqual({
      kind: "bounded",
      startYm: "2026-01",
      endYm: "2026-12",
    });
  });

  it("counts ordinary payments as covering one parcela each", () => {
    // Three months paid, one parcela each: the series still ends in December.
    expect(installmentWindow(parcelado(12), 3, 3)).toEqual({
      kind: "bounded",
      startYm: "2026-01",
      endYm: "2026-12",
    });
  });

  it("shortens by 2 months when one payment covers 3 parcelas", () => {
    expect(installmentWindow(parcelado(12), 3, 1)).toEqual({
      kind: "bounded",
      startYm: "2026-01",
      endYm: "2026-10",
    });
  });

  it("accumulates the shortening across several prepayments", () => {
    // Two payments, covering 3 and 2 parcelas: 3 extra parcelas absorbed.
    expect(installmentWindow(parcelado(12), 5, 2)).toEqual({
      kind: "bounded",
      startYm: "2026-01",
      endYm: "2026-09",
    });
  });

  it("clamps rather than running backwards when coverage exceeds the total", () => {
    // One payment absorbing the whole series, and then some.
    expect(installmentWindow(parcelado(12), 20, 1)).toEqual({
      kind: "bounded",
      startYm: "2026-01",
      endYm: "2026-01",
    });
  });

  it("crosses the year boundary", () => {
    expect(installmentWindow(parcelado(18, "2026-08-01"), 0, 0)).toEqual({
      kind: "bounded",
      startYm: "2026-08",
      endYm: "2028-01",
    });
  });

  it("gives a single-parcela series a one-month window", () => {
    expect(installmentWindow(parcelado(1), 0, 0)).toEqual({
      kind: "bounded",
      startYm: "2026-01",
      endYm: "2026-01",
    });
  });
});

describe("expandTemplateForMonth", () => {
  it("emits nothing before a parcelamento starts", () => {
    expect(expandTemplateForMonth(parcelado(12), 2025, 12, 0, 0)).toEqual([]);
  });

  it("emits inside a parcelamento's window", () => {
    expect(expandTemplateForMonth(parcelado(12), 2026, 6, 0, 0)).toEqual([
      "2026-06-10",
    ]);
  });

  it("emits nothing after a parcelamento ends", () => {
    expect(expandTemplateForMonth(parcelado(12), 2027, 1, 0, 0)).toEqual([]);
  });

  it("stops early once a prepayment has shortened the series", () => {
    // A payment covering 3 parcelas pulls the end back from December to
    // October, so November no longer emits.
    expect(expandTemplateForMonth(parcelado(12), 2026, 11, 3, 1)).toEqual([]);
    expect(expandTemplateForMonth(parcelado(12), 2026, 10, 3, 1)).toEqual([
      "2026-10-10",
    ]);
  });

  it("emits nothing at all for a parcelamento with no start month", () => {
    const tpl = template({ installments_total: 12 });
    expect(expandTemplateForMonth(tpl, 2026, 6, 0, 0)).toEqual([]);
  });

  it("leaves an ordinary monthly Conta untouched by any of this", () => {
    expect(expandTemplateForMonth(template(), 2026, 6, 0, 0)).toEqual([
      "2026-06-10",
    ]);
    // Far outside any plausible parcelamento window.
    expect(expandTemplateForMonth(template(), 2099, 3, 0, 0)).toEqual([
      "2099-03-10",
    ]);
  });

  it("clamps a due day past the end of a short month", () => {
    const tpl = template({ due_day: 31 });
    expect(expandTemplateForMonth(tpl, 2026, 2, 0, 0)).toEqual(["2026-02-28"]);
  });

  it("emits every matching weekday for a weekly Conta", () => {
    const tpl = template({ cadence: "weekly", due_day: null, day_of_week: 1 });
    // Mondays in February 2026.
    expect(expandTemplateForMonth(tpl, 2026, 2, 0, 0)).toEqual([
      "2026-02-02",
      "2026-02-09",
      "2026-02-16",
      "2026-02-23",
    ]);
  });
});

// Moved into date.ts during review: a date-string helper belongs beside the
// others, not privately inside the fold that happened to need it first.
describe("dayOfMonthFromYmd", () => {
  it("reads the day off the string", () => {
    expect(dayOfMonthFromYmd("2026-04-20")).toBe(20);
  });

  it("reads the first of the month as 1, not the previous day", () => {
    // Where `new Date("2026-04-01")` would slip back in São Paulo.
    expect(dayOfMonthFromYmd("2026-04-01")).toBe(1);
  });

  it("returns null for something that isn't a date", () => {
    expect(dayOfMonthFromYmd("nonsense")).toBeNull();
    expect(dayOfMonthFromYmd("2026-04")).toBeNull();
  });
});
