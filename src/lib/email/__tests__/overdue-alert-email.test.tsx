import { describe, expect, it } from "vitest";
import {
  alertSubject,
  renderOverdueAlertEmail,
} from "../OverdueAlertEmail";
import type { AlertRow } from "@/helpers/alerts";

const rows: AlertRow[] = [
  { name: "Claro", date: "2026-04-05", amount: 470, paid: false },
  {
    name: "Apartamento — parcela 12/240",
    date: "2026-04-08",
    amount: 3000,
    paid: false,
  },
];

function render(over: { rows?: AlertRow[]; total?: number } = {}) {
  return renderOverdueAlertEmail({
    userName: "Joao",
    rows: over.rows ?? rows,
    total: over.total ?? 3470,
    monthUrl: "https://example.test/months/2026/4",
    settingsUrl: "https://example.test/settings",
  });
}

describe("alertSubject", () => {
  it("says how many are Vencidas", () => {
    expect(alertSubject(3)).toBe("Você tem 3 pagamentos vencidos");
  });

  it("uses the singular for one", () => {
    expect(alertSubject(1)).toBe("Você tem 1 pagamento vencido");
  });
});

describe("renderOverdueAlertEmail", () => {
  it("names every Obrigação in both bodies", async () => {
    const { html, text } = await render();
    for (const body of [html, text]) {
      expect(body).toContain("Claro");
      expect(body).toContain("Apartamento — parcela 12/240");
    }
  });

  it("shows each amount and the total in Brazilian currency", async () => {
    const { text } = await render();
    // Non-breaking space after R$ is what Intl emits for pt-BR; normalise so
    // the assertion is about the number, not the separator.
    const normalised = text.replace(/ /g, " ");
    expect(normalised).toContain("R$ 470,00");
    expect(normalised).toContain("R$ 3.000,00");
    expect(normalised).toContain("R$ 3.470,00");
  });

  // The timezone trap this app hits everywhere it prints a calendar date:
  // "2026-04-05" parsed as a Date is UTC midnight, which in São Paulo is
  // the 4th. The due date must read as the day the Obrigação was due.
  it("prints the due date as the calendar date, not a timezone shift", async () => {
    const { text } = await render();
    // Day/month with no year, the same shape the monthly view uses — an
    // Aviso is always about the month you are in.
    expect(text).toContain("Venceu em 05/04");
    expect(text).not.toContain("Venceu em 04/04");
  });

  it("links to the month and to settings", async () => {
    const { html } = await render();
    expect(html).toContain("https://example.test/months/2026/4");
    expect(html).toContain("https://example.test/settings");
  });

  // The email says so out loud, because a daily repeat with no explanation
  // reads as a malfunction rather than a decision.
  it("tells the reader it will repeat daily and how to stop it", async () => {
    const { text } = await render();
    expect(text).toContain("se repete a cada dia");
  });

  it("uses the singular phrasing for a single Obrigação", async () => {
    const { text } = await render({ rows: [rows[0]], total: 470 });
    expect(text).toContain("um pagamento vencido");
  });

  // The list mixes Contas and parcelas, and CONTEXT.md is explicit that a
  // Financiamento is not a Conta — so the lead sentence cannot call them all
  // contas just because most of them usually are.
  it("does not call the whole list Contas", async () => {
    const { text } = await render();
    expect(text).not.toContain("contas vencidas");
  });
});
