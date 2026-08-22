import { describe, expect, it } from "vitest";
import { foldNonEmptyMonths } from "../report-months";

// A space that started in January 2026, reporting up to December 2026.
const YEAR = { spaceStartYm: "2026-01", endYm: "2026-12" };

const noTemplates = { ...YEAR, datedMonths: [], templates: [] };

// A Conta recorrente with no parcelamento — it covers every month.
const indefinite = {
  installments_total: null,
  installments_start_month: null,
  paidCovered: 0,
  paidRows: 0,
};

// A parcelamento in `total` parcelas from January 2026.
function parcelado(total: number, paidCovered = 0, paidRows = 0) {
  return {
    installments_total: total,
    installments_start_month: "2026-01-01",
    paidCovered,
    paidRows,
  };
}

function months(result: { year: number; month: number }[]): string[] {
  return result.map((r) => `${r.year}-${String(r.month).padStart(2, "0")}`);
}

describe("foldNonEmptyMonths", () => {
  it("reports nothing for a space with no data and no Contas", () => {
    expect(foldNonEmptyMonths(noTemplates)).toEqual([]);
  });

  it("reports a month that only has a materialized entry or Receita", () => {
    const result = foldNonEmptyMonths({
      ...noTemplates,
      datedMonths: ["2026-03", "2026-07"],
    });
    expect(months(result)).toEqual(["2026-07", "2026-03"]);
  });

  it("returns months newest first", () => {
    const result = foldNonEmptyMonths({
      ...noTemplates,
      datedMonths: ["2026-02", "2026-09", "2026-05"],
    });
    expect(months(result)).toEqual(["2026-09", "2026-05", "2026-02"]);
  });

  it("counts a month as non-empty when only a Conta recorrente covers it", () => {
    const result = foldNonEmptyMonths({ ...YEAR, datedMonths: [], templates: [indefinite] });
    expect(months(result)).toHaveLength(12);
    expect(months(result)[0]).toBe("2026-12");
    expect(months(result)[11]).toBe("2026-01");
  });

  it("counts only the months a parcelamento actually covers", () => {
    const result = foldNonEmptyMonths({
      ...YEAR,
      datedMonths: [],
      templates: [parcelado(3)],
    });
    expect(months(result)).toEqual(["2026-03", "2026-02", "2026-01"]);
  });

  it("drops months past a prepaid series' shortened end", () => {
    // 6x, one payment covering 3 parcelas: ends in April, not June.
    const result = foldNonEmptyMonths({
      ...YEAR,
      datedMonths: [],
      templates: [parcelado(6, 3, 1)],
    });
    expect(months(result)).toEqual([
      "2026-04",
      "2026-03",
      "2026-02",
      "2026-01",
    ]);
  });

  it("still reports a month a prepayment removed if it has its own data", () => {
    const result = foldNonEmptyMonths({
      ...YEAR,
      datedMonths: ["2026-06"],
      templates: [parcelado(6, 3, 1)],
    });
    expect(months(result)).toContain("2026-06");
  });

  it("contributes nothing for a parcelamento with no start month", () => {
    const result = foldNonEmptyMonths({
      ...YEAR,
      datedMonths: [],
      templates: [
        {
          installments_total: 6,
          installments_start_month: null,
          paidCovered: 0,
          paidRows: 0,
        },
      ],
    });
    expect(result).toEqual([]);
  });

  it("never reports a month before the space existed", () => {
    const result = foldNonEmptyMonths({
      spaceStartYm: "2026-06",
      endYm: "2026-12",
      datedMonths: ["2026-02"],
      templates: [parcelado(12)],
    });
    expect(months(result).every((m) => m >= "2026-06")).toBe(true);
  });

  it("never reports a month past the requested end", () => {
    const result = foldNonEmptyMonths({
      spaceStartYm: "2026-01",
      endYm: "2026-04",
      datedMonths: ["2026-11"],
      templates: [indefinite],
    });
    expect(months(result)).toEqual([
      "2026-04",
      "2026-03",
      "2026-02",
      "2026-01",
    ]);
  });

  it("reports a month once when several sources cover it", () => {
    const result = foldNonEmptyMonths({
      ...YEAR,
      datedMonths: ["2026-01", "2026-01"],
      templates: [parcelado(2), indefinite],
    });
    expect(months(result).filter((m) => m === "2026-01")).toHaveLength(1);
  });
});
