import { describe, expect, it } from "vitest";
import { previousYmd } from "../date";

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

  it("returns the input unchanged when it is not a date", () => {
    expect(previousYmd("nonsense")).toBe("nonsense");
  });
});
