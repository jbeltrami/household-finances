import { describe, expect, it } from "vitest";
import {
  isInRange,
  isYmdInRange,
  selectDay,
  type DayRange,
} from "../day-range";

const range = (from: number, to: number): DayRange => ({ from, to });

describe("selectDay", () => {
  it("starts a one-day Período when none is selected", () => {
    expect(selectDay(null, 10)).toEqual(range(10, 10));
  });

  it("extends a one-day Período to the day clicked next", () => {
    expect(selectDay(range(12, 12), 20)).toEqual(range(12, 20));
  });

  // Clicking the later day first points at two ends; it does not retract.
  it("normalises a backwards second click", () => {
    expect(selectDay(range(20, 20), 12)).toEqual(range(12, 20));
  });

  it("clears a one-day Período when its own day is clicked again", () => {
    expect(selectDay(range(10, 10), 10)).toBeNull();
  });

  it("restarts from the day clicked inside a Período", () => {
    expect(selectDay(range(12, 20), 15)).toEqual(range(15, 15));
  });

  it("restarts from the day clicked outside a Período", () => {
    expect(selectDay(range(12, 20), 3)).toEqual(range(3, 3));
  });

  // The one rule for a third click, with no exception carved out for the
  // ends: clicking an end of a span restarts from it like any other day,
  // rather than trimming the span or clearing it.
  it("restarts from an end of a Período rather than clearing it", () => {
    expect(selectDay(range(12, 20), 12)).toEqual(range(12, 12));
    expect(selectDay(range(12, 20), 20)).toEqual(range(20, 20));
  });

  it("does not mutate the Período it is given", () => {
    const current = range(12, 12);
    selectDay(current, 20);
    expect(current).toEqual(range(12, 12));
  });
});

describe("isInRange", () => {
  it("has no members when nothing is selected", () => {
    expect(isInRange(null, 10)).toBe(false);
  });

  it("holds the single day of a Período whose ends coincide", () => {
    expect(isInRange(range(10, 10), 10)).toBe(true);
    expect(isInRange(range(10, 10), 11)).toBe(false);
  });

  it("holds both ends of a span and the days between them", () => {
    expect(isInRange(range(12, 20), 12)).toBe(true);
    expect(isInRange(range(12, 20), 16)).toBe(true);
    expect(isInRange(range(12, 20), 20)).toBe(true);
  });

  it("excludes the days either side of a span", () => {
    expect(isInRange(range(12, 20), 11)).toBe(false);
    expect(isInRange(range(12, 20), 21)).toBe(false);
  });
});

describe("isYmdInRange", () => {
  it("holds a date whose day falls in the Período", () => {
    expect(isYmdInRange(range(12, 20), "2026-09-16")).toBe(true);
  });

  it("excludes a date whose day falls outside it", () => {
    expect(isYmdInRange(range(12, 20), "2026-09-21")).toBe(false);
  });

  it("has no members when nothing is selected", () => {
    expect(isYmdInRange(null, "2026-09-16")).toBe(false);
  });

  // The reason this exists rather than each caller parsing for itself: a
  // hand-rolled parseInt yields NaN on a malformed date, and NaN silently
  // fails every comparison, which is the same answer as "outside" arrived at
  // by accident.
  it("excludes a malformed date rather than comparing NaN", () => {
    expect(isYmdInRange(range(1, 31), "nonsense")).toBe(false);
  });
});
