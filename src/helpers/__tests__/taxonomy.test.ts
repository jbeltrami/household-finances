import { describe, expect, it } from "vitest";
import { getTaxonomy, payerInitials } from "../taxonomy";
import { fakeSupabase } from "./fake-supabase";

const CATEGORIES = [
  { id: "c1", kind: "outflow", name: "Moradia", icon: null, color: "slate", active: true },
  { id: "c2", kind: "outflow", name: "Água", icon: null, color: "blue", active: true },
  { id: "c3", kind: "outflow", name: "Antigo", icon: null, color: "red", active: false },
  { id: "c4", kind: "income", name: "Salário", icon: null, color: "green", active: true },
  { id: "c5", kind: "income", name: "Extinta", icon: null, color: "gray", active: false },
];

const PAYERS = [
  { id: "p1", name: "Occam", color: "blue", active: true },
  { id: "p2", name: "Banco do Brasil", color: "green", active: true },
  { id: "p3", name: "Antigo Emprego", color: "gray", active: false },
];

function client() {
  return fakeSupabase({ categories: CATEGORIES, payers: PAYERS }).client;
}

describe("getTaxonomy", () => {
  it("offers only active Categorias for each direction", async () => {
    const t = await getTaxonomy(client(), "space-1");
    expect(t.outflow.active.map((c) => c.id)).toEqual(["c2", "c1"]);
    expect(t.income.active.map((c) => c.id)).toEqual(["c4"]);
  });

  it("never mixes the two directions", async () => {
    const t = await getTaxonomy(client(), "space-1");
    expect(t.outflow.active.every((c) => c.kind === "outflow")).toBe(true);
    expect(t.income.active.every((c) => c.kind === "income")).toBe(true);
    expect(t.outflow.byId.has("c4")).toBe(false);
    expect(t.income.byId.has("c1")).toBe(false);
  });

  it("resolves a deactivated Categoria, so its history keeps its label", async () => {
    const t = await getTaxonomy(client(), "space-1");
    expect(t.outflow.byId.get("c3")?.name).toBe("Antigo");
    expect(t.income.byId.get("c5")?.name).toBe("Extinta");
  });

  it("sorts Categorias the way a Portuguese reader expects", async () => {
    // "Água" before "Moradia": the default Postgres collation would not.
    const t = await getTaxonomy(client(), "space-1");
    expect(t.outflow.active.map((c) => c.name)).toEqual(["Água", "Moradia"]);
  });

  it("offers only active Pagadores but resolves retired ones", async () => {
    const t = await getTaxonomy(client(), "space-1");
    expect(t.payers.active.map((p) => p.id)).toEqual(["p2", "p1"]);
    expect(t.payers.byId.get("p3")?.name).toBe("Antigo Emprego");
  });

  it("copes with a space that has neither", async () => {
    const { client } = fakeSupabase({ categories: [], payers: [] });
    const t = await getTaxonomy(client, "space-1");
    expect(t.outflow.active).toEqual([]);
    expect(t.income.byId.size).toBe(0);
    expect(t.payers.active).toEqual([]);
  });
});

describe("payerInitials", () => {
  it("takes the first and last word", () => {
    expect(payerInitials("Banco do Brasil")).toBe("BB");
  });

  it("takes two letters from a single word", () => {
    expect(payerInitials("Occam")).toBe("OC");
  });

  it("copes with an empty name", () => {
    expect(payerInitials("   ")).toBe("?");
  });
});
