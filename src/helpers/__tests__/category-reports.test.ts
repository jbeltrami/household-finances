import { describe, expect, it } from "vitest";
import {
  foldCategorySpend,
  type SpendEntry,
  type SpendTemplate,
} from "../category-reports";
import type { ResolvedCategory } from "../types";

// Fixtures. Builders rather than literals so each test states only the field
// it is about — a test that spells out `skipped: false` alongside the thing it
// actually cares about hides its own point.

const MORADIA: ResolvedCategory = {
  id: "cat-moradia",
  name: "Moradia",
  icon: "home",
  color: "sky",
};
const CONSUMO: ResolvedCategory = {
  id: "cat-consumo",
  name: "Consumo",
  icon: "utensils",
  color: "violet",
};
const RETIRED: ResolvedCategory = {
  id: "cat-retired",
  name: "Ocam",
  icon: null,
  color: "slate",
};

const CLARO: SpendTemplate = { id: "tpl-claro", category_id: MORADIA.id };
const UNTAGGED_TEMPLATE: SpendTemplate = { id: "tpl-bare", category_id: null };

// Ids are generated so a test can create several rows without naming each
// one; the tests that care about identity pass their own.
let seq = 0;
function nextId() {
  seq += 1;
  return `row-${seq}`;
}

function bill(over: Partial<SpendEntry> = {}): SpendEntry {
  return {
    id: nextId(),
    name: "Claro",
    date: "2026-03-10",
    template_id: CLARO.id,
    category_id: null,
    amount: 100,
    paid: true,
    skipped: false,
    ...over,
  };
}

function despesa(over: Partial<SpendEntry> = {}): SpendEntry {
  return {
    id: nextId(),
    name: "Almoço",
    date: "2026-03-05",
    template_id: null,
    category_id: CONSUMO.id,
    amount: 50,
    paid: false,
    skipped: false,
    ...over,
  };
}

const ALL_CATEGORIES = [MORADIA, CONSUMO, RETIRED];

function fold(entries: SpendEntry[], templates: SpendTemplate[] = [CLARO]) {
  return foldCategorySpend(entries, templates, ALL_CATEGORIES);
}

function byName(result: ReturnType<typeof fold>, name: string) {
  return result.find((r) => r.category?.name === name);
}

function uncategorised(result: ReturnType<typeof fold>) {
  return result.find((r) => r.category == null);
}

describe("foldCategorySpend", () => {
  describe("inheritance", () => {
    it("classifies a template-bound row with no Categoria by its template", () => {
      const result = fold([bill({ category_id: null })]);

      expect(byName(result, "Moradia")?.total).toBe(100);
      expect(uncategorised(result)).toBeUndefined();
    });

    it("lets a row's own Categoria win over its template's", () => {
      const result = fold([bill({ category_id: CONSUMO.id })]);

      expect(byName(result, "Consumo")?.total).toBe(100);
      expect(byName(result, "Moradia")).toBeUndefined();
    });

    it("leaves a row uncategorised when neither it nor its template has one", () => {
      const result = fold(
        [bill({ template_id: UNTAGGED_TEMPLATE.id, category_id: null })],
        [UNTAGGED_TEMPLATE]
      );

      expect(uncategorised(result)?.total).toBe(100);
    });

    it("does not let a one-off inherit from an unrelated template", () => {
      // A one-off has no template_id, so there is nothing to inherit from
      // even when templates are present in the same range.
      const result = fold([despesa({ category_id: null })]);

      expect(uncategorised(result)?.total).toBe(50);
      expect(byName(result, "Moradia")).toBeUndefined();
    });
  });

  describe("what counts as spend", () => {
    it("counts a Conta only when it is paid", () => {
      const result = fold([bill({ paid: true }), bill({ paid: false })]);

      expect(byName(result, "Moradia")?.total).toBe(100);
      expect(byName(result, "Moradia")?.billsCount).toBe(1);
    });

    it("counts a Despesa regardless of its paid flag", () => {
      const result = fold([despesa({ paid: false }), despesa({ paid: true })]);

      expect(byName(result, "Consumo")?.total).toBe(100);
      expect(byName(result, "Consumo")?.expensesCount).toBe(2);
    });

    it("excludes skipped rows on both sides", () => {
      const result = fold([
        bill({ skipped: true }),
        despesa({ skipped: true }),
      ]);

      expect(result).toEqual([]);
    });

    it("keeps Contas and Despesas separate within one Categoria", () => {
      const result = fold([
        bill({ category_id: CONSUMO.id, amount: 100 }),
        despesa({ amount: 50 }),
      ]);
      const consumo = byName(result, "Consumo");

      expect(consumo?.total).toBe(150);
      expect(consumo?.billsTotal).toBe(100);
      expect(consumo?.expensesTotal).toBe(50);
      expect(consumo?.count).toBe(2);
    });

    it("ignores rows whose amount is not a finite number", () => {
      // Postgres numerics arrive as strings, so the coercion is real; a row
      // that cannot be coerced must be skipped rather than poison a total
      // with NaN.
      const result = fold([
        despesa({ amount: "50.25" }),
        despesa({ amount: "not a number" }),
      ]);

      expect(byName(result, "Consumo")?.total).toBe(50.25);
      expect(byName(result, "Consumo")?.count).toBe(1);
    });
  });

  describe("uncategorised money", () => {
    it("accumulates into its own bucket rather than being dropped", () => {
      const result = fold([despesa({ category_id: null, amount: 30 })]);

      expect(uncategorised(result)?.total).toBe(30);
    });

    it("is pinned last even when it is the largest bucket", () => {
      // Ordering here is deliberate and load-bearing. The fold accumulates in
      // Map insertion order, and V8's insertion sort only ever passes the
      // pivot — a *later* element — as the comparator's first argument. So a
      // test where the uncategorised bucket is accumulated first never calls
      // the comparator with it as `a`, and the branch that pins it last is
      // never reached. A mutation deleting that branch survived twice before
      // this arrangement caught it.
      //
      // Hence: a categorised entry first, then the large uncategorised one.
      const result = fold([
        despesa({ category_id: MORADIA.id, amount: 10 }),
        despesa({ category_id: null, amount: 1000 }),
        despesa({ category_id: CONSUMO.id, amount: 20 }),
      ]);

      expect(result.map((r) => r.category?.name ?? null)).toEqual([
        "Consumo",
        "Moradia",
        null,
      ]);
    });

    it("treats a Categoria id that no longer resolves as uncategorised", () => {
      // A deleted Categoria sets referencing rows to NULL, but a stale id
      // could still arrive from a race. It must not crash or vanish.
      const result = fold([despesa({ category_id: "cat-deleted" })]);

      expect(uncategorised(result)?.total).toBe(50);
    });
  });

  describe("deactivated Categorias", () => {
    it("still labels the history filed under it", () => {
      // The fetch side passes includeInactive for exactly this reason:
      // retiring a Categoria must not silently move its months into
      // "Sem categoria".
      const result = fold([despesa({ category_id: RETIRED.id })]);

      expect(byName(result, "Ocam")?.total).toBe(50);
      expect(uncategorised(result)).toBeUndefined();
    });
  });

  describe("contributing lines", () => {
    it("keeps one line per counted row", () => {
      const result = fold([bill(), bill(), despesa()]);
      const moradia = byName(result, "Moradia");
      const consumo = byName(result, "Consumo");

      expect(moradia?.lines).toHaveLength(2);
      expect(consumo?.lines).toHaveLength(1);
    });

    it("keeps lines and count in agreement for every bucket", () => {
      // The invariant that makes the expansion trustworthy: a total can never
      // claim a composition it does not have.
      const result = fold([
        bill(),
        bill({ category_id: CONSUMO.id }),
        despesa(),
        despesa({ category_id: null }),
        bill({ paid: false }),
        despesa({ skipped: true }),
      ]);

      for (const bucket of result) {
        expect(bucket.lines).toHaveLength(bucket.count);
        expect(bucket.lines.reduce((s, l) => s + l.amount, 0)).toBeCloseTo(
          bucket.total
        );
      }
    });

    it("excludes rows the totals excluded", () => {
      const result = fold([
        bill({ paid: false, name: "unpaid conta" }),
        despesa({ skipped: true, name: "skipped despesa" }),
        despesa({ name: "counted" }),
      ]);
      const names = result.flatMap((r) => r.lines.map((l) => l.name));

      expect(names).toEqual(["counted"]);
    });

    it("marks each line as a Conta or a Despesa", () => {
      const result = fold([
        bill({ category_id: CONSUMO.id }),
        despesa(),
      ]);
      const kinds = byName(result, "Consumo")?.lines.map((l) => l.kind);

      expect(kinds).toContain("bill");
      expect(kinds).toContain("expense");
    });

    it("orders lines by amount, largest first", () => {
      const result = fold([
        despesa({ amount: 10, name: "small" }),
        despesa({ amount: 300, name: "large" }),
        despesa({ amount: 50, name: "medium" }),
      ]);

      expect(byName(result, "Consumo")?.lines.map((l) => l.name)).toEqual([
        "large",
        "medium",
        "small",
      ]);
    });
  });

  describe("ordering and shape", () => {
    it("sorts categories by total, descending", () => {
      const result = fold([
        despesa({ category_id: CONSUMO.id, amount: 10 }),
        despesa({ category_id: RETIRED.id, amount: 90 }),
        bill({ amount: 50 }),
      ]);

      expect(result.map((r) => r.category?.name)).toEqual([
        "Ocam",
        "Moradia",
        "Consumo",
      ]);
    });

    it("carries the Categoria's identity, icon and colour", () => {
      const result = fold([bill()]);

      expect(byName(result, "Moradia")?.category).toEqual(MORADIA);
    });

    it("returns an empty array for no entries", () => {
      expect(fold([])).toEqual([]);
    });
  });
});
