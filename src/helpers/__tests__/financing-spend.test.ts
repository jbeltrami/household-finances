import { describe, expect, it } from "vitest";
import { buildFinancingSpendRows } from "../financing";

const CASA = {
  id: "fin-1",
  name: "Casa Mont Blanc",
  category_id: "cat-moradia",
};

// Three monthly installments across a year boundary, so the range edges are
// real rather than contrived.
const SCHEDULE = [
  { number: 1, date: "2025-12-08", payment: 3000 },
  { number: 2, date: "2026-01-08", payment: 3000 },
  { number: 3, date: "2026-06-08", payment: 3000 },
  { number: 4, date: "2026-12-31", payment: 3000 },
  { number: 5, date: "2027-01-01", payment: 3000 },
];

const YEAR = ["2026-01-01", "2026-12-31"] as const;

function rows(
  paid: number[],
  extras: { id: string; date: string; amount: number }[] = [],
  range: readonly [string, string] = YEAR
) {
  return buildFinancingSpendRows(
    CASA,
    SCHEDULE,
    new Set(paid),
    extras,
    range[0],
    range[1]
  );
}

describe("buildFinancingSpendRows", () => {
  describe("the date range", () => {
    it("excludes installments before the range", () => {
      expect(rows([1]).map((r) => r.date)).toEqual([]);
    });

    it("excludes installments after the range", () => {
      expect(rows([5]).map((r) => r.date)).toEqual([]);
    });

    it("includes an installment on the first day", () => {
      // Both ends inclusive, matching the gte/lte the entries query uses —
      // a half-open range here would silently drop a January payment.
      expect(rows([2]).map((r) => r.date)).toEqual(["2026-01-08"]);
    });

    it("includes an installment on the last day", () => {
      expect(rows([4]).map((r) => r.date)).toEqual(["2026-12-31"]);
    });

    it("includes a payment when the range is a single day", () => {
      // start === end is the degenerate boundary, and the one a half-open
      // comparison collapses to nothing.
      //
      // An earlier version of this claimed it also proved the comparison
      // stays in string space rather than parsing Dates. It does not, and
      // mutation testing said so: both sides of a date-only comparison parse
      // to UTC midnight, so `new Date(a) <= new Date(b)` is symmetric with
      // `a <= b`. The UTC trap CLAUDE.md warns about bites on *formatting* —
      // rendering "2026-06-08" as 07/06 in São Paulo — not on comparing.
      // String comparison is still what this code does, because it is
      // simpler and allocates nothing; it just is not load-bearing here.
      const oneDay = ["2026-06-08", "2026-06-08"] as const;
      expect(rows([3], [], oneDay)).toHaveLength(1);
    });
  });

  describe("what counts", () => {
    it("counts only installments marked paid", () => {
      expect(rows([2, 3]).map((r) => r.name)).toEqual([
        "Casa Mont Blanc — parcela 2",
        "Casa Mont Blanc — parcela 3",
      ]);
    });

    it("ignores unpaid installments inside the range", () => {
      expect(rows([])).toEqual([]);
    });

    it("classifies a paid installment as a Conta", () => {
      expect(rows([2])[0].kind).toBe("bill");
    });

    it("classifies an amortização extraordinária as a Despesa", () => {
      const out = rows([], [{ id: "x1", date: "2026-05-01", amount: 10000 }]);

      expect(out).toHaveLength(1);
      expect(out[0].kind).toBe("expense");
      expect(out[0].amount).toBe(10000);
    });

    it("filters extras by the same range", () => {
      const out = rows([], [
        { id: "x1", date: "2025-05-01", amount: 1 },
        { id: "x2", date: "2026-05-01", amount: 2 },
        { id: "x3", date: "2027-05-01", amount: 3 },
      ]);

      expect(out.map((r) => r.amount)).toEqual([2]);
    });
  });

  describe("shape", () => {
    it("carries the Financiamento's Categoria onto every row", () => {
      const out = rows([2, 3], [{ id: "x1", date: "2026-05-01", amount: 1 }]);

      expect(out).toHaveLength(3);
      for (const r of out) expect(r.category_id).toBe("cat-moradia");
    });

    it("leaves template_id null — there is no template to inherit from", () => {
      // The reason SpendEntry carries an explicit `kind`: were it inferred
      // from template_id, these rows would be misclassified as Despesas.
      for (const r of rows([2])) expect(r.template_id).toBeNull();
    });

    it("gives every row a stable, unique id", () => {
      const out = rows([2, 3, 4], [
        { id: "x1", date: "2026-05-01", amount: 1 },
        { id: "x2", date: "2026-06-01", amount: 2 },
      ]);
      const ids = out.map((r) => r.id);

      expect(new Set(ids).size).toBe(ids.length);
      expect(ids).toContain("financing:fin-1:2");
      expect(ids).toContain("financing-extra:x1");
    });

    it("returns nothing for a financing with no activity in range", () => {
      expect(rows([1, 5], [{ id: "x", date: "2020-01-01", amount: 1 }])).toEqual([]);
    });
  });
});
