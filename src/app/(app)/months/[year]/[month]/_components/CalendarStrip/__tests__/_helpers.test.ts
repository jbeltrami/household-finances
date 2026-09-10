import { describe, expect, it } from "vitest";
import { buildCalendarGrid, type CalendarCell } from "../_helpers";

const cell = (
  year: number,
  month: number,
  day: number,
  inCurrentMonth: boolean
): CalendarCell => ({ year, month, day, inCurrentMonth });

describe("buildCalendarGrid", () => {
  // The one assertion that pins the week start. Everything else about the
  // grid — its length, its padding — held under Monday-first too.
  it("always opens on a Sunday", () => {
    for (let year = 2024; year <= 2029; year++) {
      for (let month = 1; month <= 12; month++) {
        const [first] = buildCalendarGrid(year, month);
        const asDate = new Date(first.year, first.month - 1, first.day);
        expect(asDate.getDay()).toBe(0);
      }
    }
  });

  it("always returns 42 cells holding the month's days in order", () => {
    for (let year = 2024; year <= 2029; year++) {
      for (let month = 1; month <= 12; month++) {
        const cells = buildCalendarGrid(year, month);
        expect(cells).toHaveLength(42);

        const inMonth = cells.filter((c) => c.inCurrentMonth);
        const daysInMonth = new Date(year, month, 0).getDate();
        expect(inMonth.map((c) => c.day)).toEqual(
          Array.from({ length: daysInMonth }, (_, i) => i + 1)
        );
      }
    }
  });

  // February 2026 opens on a Sunday, so it needs no leading cells and fills
  // only four rows. The grid pads to 42 regardless, which leaves two whole
  // rows of March greyed out beneath it — accepted, so that the card's height
  // never changes as the user arrows between months.
  it("pads a 28-day month that starts on Sunday with two full trailing rows", () => {
    const cells = buildCalendarGrid(2026, 2);

    expect(cells[0]).toEqual(cell(2026, 2, 1, true));
    expect(cells[27]).toEqual(cell(2026, 2, 28, true));
    expect(cells[28]).toEqual(cell(2026, 3, 1, false));
    expect(cells[41]).toEqual(cell(2026, 3, 14, false));
  });

  // January 2028 opens on a Saturday with 31 days: 6 + 31 = 37 cells, the
  // most a month can occupy. Its leading cells also cross a year boundary.
  it("fits the widest month and reaches back into the previous year", () => {
    const cells = buildCalendarGrid(2028, 1);

    expect(cells[0]).toEqual(cell(2027, 12, 26, false));
    expect(cells[5]).toEqual(cell(2027, 12, 31, false));
    expect(cells[6]).toEqual(cell(2028, 1, 1, true));
    expect(cells[36]).toEqual(cell(2028, 1, 31, true));
    expect(cells[37]).toEqual(cell(2028, 2, 1, false));
    expect(cells[41]).toEqual(cell(2028, 2, 5, false));
  });

  it("carries a leap February through to the 29th", () => {
    const cells = buildCalendarGrid(2024, 2);

    expect(cells[0]).toEqual(cell(2024, 1, 28, false));
    expect(cells[3]).toEqual(cell(2024, 1, 31, false));
    expect(cells[4]).toEqual(cell(2024, 2, 1, true));
    expect(cells[32]).toEqual(cell(2024, 2, 29, true));
    expect(cells[33]).toEqual(cell(2024, 3, 1, false));
  });
});
