import { describe, expect, it } from "vitest";
import { formatDayLabel, formatRangeLabel, previousYmd } from "../date";

describe("previousYmd", () => {
  it("steps back a day inside a month", () => {
    expect(previousYmd("2026-04-15")).toBe("2026-04-14");
  });

  // The Aviso's cutoff is yesterday, so on the 1st it lands in the previous
  // month — the month that has just locked. That is the intended behaviour,
  // not an edge to guard against: nothing in the current month is Vencida yet.
  it("crosses into the previous month", () => {
    expect(previousYmd("2026-05-01")).toBe("2026-04-30");
  });

  it("crosses a year boundary", () => {
    expect(previousYmd("2026-01-01")).toBe("2025-12-31");
  });

  it("handles a leap day", () => {
    expect(previousYmd("2028-03-01")).toBe("2028-02-29");
  });

  it("handles a non-leap February", () => {
    expect(previousYmd("2026-03-01")).toBe("2026-02-28");
  });

  // The cutoff is compared against every Obrigação's date, and digits sort
  // before letters — so passing a non-date through would make "2026-12-31 <=
  // nonsense" true and report the whole month as Vencida.
  it("throws rather than pass a non-date through as a cutoff", () => {
    expect(() => previousYmd("nonsense")).toThrow("Not a date");
  });
});

describe("formatDayLabel", () => {
  it("names a day within its month", () => {
    expect(formatDayLabel(2026, 9, 10)).toBe("10 de setembro");
  });
});

describe("formatRangeLabel", () => {
  it("collapses to the single-day form when the ends coincide", () => {
    expect(formatRangeLabel(2026, 9, { from: 10, to: 10 })).toBe(
      "10 de setembro"
    );
  });

  it("names both ends of a span", () => {
    expect(formatRangeLabel(2026, 9, { from: 10, to: 15 })).toBe(
      "10 a 15 de setembro"
    );
  });

  // A Período never spans two months, so the month is named once, at the end,
  // where it reads as belonging to the whole span.
  it("names the month once, over a span covering it", () => {
    expect(formatRangeLabel(2026, 2, { from: 1, to: 28 })).toBe(
      "1 a 28 de fevereiro"
    );
  });
});
