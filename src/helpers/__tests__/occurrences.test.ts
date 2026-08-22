import { describe, expect, it } from "vitest";
import { writeOccurrence } from "../occurrences";
import { fakeSupabase } from "./fake-supabase";

// `isMonthLocked` reads the real clock: a past month with no unlock row is
// locked, a far-future one never is. Picking dates either side of any
// plausible "today" keeps these tests from rotting.
const OPEN_MONTH = "2099-04-10";
const LOCKED_MONTH = "2020-04-10";

const TEMPLATE = {
  name: "Claro",
  default_amount: 470,
  currency: "BRL",
};

const virtualTarget = { kind: "virtual", templateId: "tpl-1", date: OPEN_MONTH } as const;

function seedForVirtual(overrides: Record<string, unknown> = {}) {
  return fakeSupabase({
    spaces: { id: "space-1" },
    recurring_bill_templates: TEMPLATE,
    month_unlocks: null,
    ...overrides,
  });
}

describe("writeOccurrence", () => {
  describe("a virtual occurrence", () => {
    it("creates a row and reports where it landed", async () => {
      const { client, recorded } = seedForVirtual();
      const result = await writeOccurrence(client, virtualTarget, {
        skipped: true,
      });

      expect(result).toMatchObject({ ok: true, year: 2099, month: 4 });
      expect(recorded.inserts).toHaveLength(1);
      expect(recorded.inserts[0].table).toBe("entries");
    });

    it("leaves Categoria unset, so the occurrence inherits from its Conta", async () => {
      const { client, recorded } = seedForVirtual();
      await writeOccurrence(client, virtualTarget, { paid: true });

      // ADR-0001: NULL on a template-bound row means "inherit", and this is
      // the one place that decides it. A row that arrived here carrying a
      // Categoria of its own would strand this payment under whatever the
      // Conta was called at the time.
      expect(recorded.inserts[0].values.category_id).toBeNull();
    });

    it("binds the row to its Conta, so it stays an exception and not a Despesa", async () => {
      const { client, recorded } = seedForVirtual();
      await writeOccurrence(client, virtualTarget, {});

      expect(recorded.inserts[0].values.template_id).toBe("tpl-1");
    });

    it("copies the Conta's name, amount and currency onto the row", async () => {
      const { client, recorded } = seedForVirtual();
      await writeOccurrence(client, virtualTarget, {});

      expect(recorded.inserts[0].values).toMatchObject({
        name: "Claro",
        amount: 470,
        currency: "BRL",
        date: OPEN_MONTH,
        space_id: "space-1",
      });
    });

    it("defaults a new row to unpaid, unskipped and covering one parcela", async () => {
      const { client, recorded } = seedForVirtual();
      await writeOccurrence(client, virtualTarget, {});

      expect(recorded.inserts[0].values).toMatchObject({
        paid: false,
        skipped: false,
        installments_covered: 1,
      });
    });

    it("lets the patch override those defaults", async () => {
      const { client, recorded } = seedForVirtual();
      await writeOccurrence(client, virtualTarget, {
        paid: true,
        amount: 1410,
        installments_covered: 3,
      });

      expect(recorded.inserts[0].values).toMatchObject({
        paid: true,
        amount: 1410,
        installments_covered: 3,
      });
    });

    it("refuses when the target month is locked, and writes nothing", async () => {
      const { client, recorded } = seedForVirtual();
      const result = await writeOccurrence(
        client,
        { kind: "virtual", templateId: "tpl-1", date: LOCKED_MONTH },
        { skipped: true }
      );

      expect(result.ok).toBe(false);
      expect(recorded.inserts).toEqual([]);
    });

    it("writes into a locked month once it has been unlocked", async () => {
      const { client, recorded } = seedForVirtual({
        month_unlocks: { reason: "corrigindo abril" },
      });
      const result = await writeOccurrence(
        client,
        { kind: "virtual", templateId: "tpl-1", date: LOCKED_MONTH },
        { skipped: true }
      );

      expect(result.ok).toBe(true);
      expect(recorded.inserts).toHaveLength(1);
    });

    it("refuses when the Conta behind the occurrence is gone", async () => {
      const { client, recorded } = seedForVirtual({
        recurring_bill_templates: null,
      });
      const result = await writeOccurrence(client, virtualTarget, {});

      expect(result).toEqual({
        ok: false,
        error: "Conta recorrente não encontrada",
      });
      expect(recorded.inserts).toEqual([]);
    });

    it("refuses an unparseable date rather than writing to no month", async () => {
      const { client, recorded } = seedForVirtual();
      const result = await writeOccurrence(
        client,
        { kind: "virtual", templateId: "tpl-1", date: "nonsense" },
        {}
      );

      expect(result.ok).toBe(false);
      expect(recorded.inserts).toEqual([]);
    });
  });

  describe("a row that already exists", () => {
    const target = { kind: "materialized", entryId: "entry-1" } as const;

    function seedForMaterialized(date = OPEN_MONTH) {
      return fakeSupabase({
        entries: { space_id: "space-1", date },
        month_unlocks: null,
      });
    }

    it("updates it rather than creating a second one", async () => {
      const { client, recorded } = seedForMaterialized();
      const result = await writeOccurrence(client, target, { amount: 1200 });

      expect(result).toMatchObject({
        ok: true,
        entryId: "entry-1",
        year: 2099,
        month: 4,
      });
      expect(recorded.inserts).toEqual([]);
      expect(recorded.updates).toHaveLength(1);
      expect(recorded.updates[0].values).toEqual({ amount: 1200 });
      expect(recorded.updates[0].filters).toEqual({ id: "entry-1" });
    });

    it("writes only what the patch names, leaving the rest of the row alone", async () => {
      const { client, recorded } = seedForMaterialized();
      await writeOccurrence(client, target, { skipped: true });

      expect(recorded.updates[0].values).toEqual({ skipped: true });
    });

    it("never touches Categoria, which stays inherited", async () => {
      const { client, recorded } = seedForMaterialized();
      await writeOccurrence(client, target, { paid: true });

      expect(recorded.updates[0].values).not.toHaveProperty("category_id");
    });

    it("refuses when the row sits in a locked month, and writes nothing", async () => {
      const { client, recorded } = seedForMaterialized(LOCKED_MONTH);
      const result = await writeOccurrence(client, target, { paid: true });

      expect(result.ok).toBe(false);
      expect(recorded.updates).toEqual([]);
    });

    it("refuses when the row is gone", async () => {
      const { client, recorded } = fakeSupabase({
        entries: null,
        month_unlocks: null,
      });
      const result = await writeOccurrence(client, target, { paid: true });

      expect(result).toEqual({
        ok: false,
        error: "Lançamento não encontrado",
      });
      expect(recorded.updates).toEqual([]);
    });
  });
});
