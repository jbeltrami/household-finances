import { dayOfMonthFromYmd } from "./date";

// The Período: a stretch of consecutive days picked out within one month.
//
// Two numbers rather than a list of days, because the interaction can only
// ever produce a contiguous span and two ends can hold the invariant that a
// list cannot. `from <= to` always, and `selectDay` is what guarantees it.
//
// Days of the month, 1-31, not dates: a Período never spans two months, so
// the month it sits in is already known to everyone who holds one. A day the
// month does not have simply has nothing on it.
export type DayRange = { from: number; to: number };

// Is this day part of the Período? The ends are members, so a Período whose
// ends coincide holds exactly one day.
export function isInRange(range: DayRange | null, day: number): boolean {
  if (range === null) return false;
  return day >= range.from && day <= range.to;
}

// The same question asked of a "YYYY-MM-DD" string, which is the shape every
// row on the monthly view actually holds.
//
// Here rather than in each caller because the obvious inline version —
// `parseInt(date.split("-")[2], 10)` — yields NaN on a malformed date, and
// NaN fails every comparison silently: the row reads as outside the Período,
// which is the right answer arrived at by accident and the wrong one as soon
// as the comparison changes. `dayOfMonthFromYmd` returns null and says so.
export function isYmdInRange(range: DayRange | null, ymd: string): boolean {
  const day = dayOfMonthFromYmd(ymd);
  return day !== null && isInRange(range, day);
}

// What clicking a day on the calendar does to the selection.
//
// A helper rather than logic inside the calendar, because this repo has no
// component test setup and logic left in a component is logic left untested.
// The rules, in full:
//
//   No Período, click a day        → a Período of that day alone.
//   One-day Período, another day   → a Período spanning both.
//   One-day Período, its own day   → cleared.
//   Any Período, any day           → a fresh one-day Período on that day.
//
// The second rule normalises: clicking 20 and then 12 gives 12–20, because a
// user who clicks the later day first is pointing at two ends rather than
// retracting. That is what lets `from <= to` hold everywhere else.
//
// The last rule has no exception, and the temptation is to give it one.
// Clearing when the click lands inside the Período would save a click, but it
// costs a special case and it makes "restart from a day in the middle"
// unreachable. The way out of a span is a fresh one-day Período, then one
// more click on the same day.
export function selectDay(
  current: DayRange | null,
  day: number
): DayRange | null {
  if (current === null) return { from: day, to: day };

  const isOneDay = current.from === current.to;

  if (isOneDay) {
    if (current.from === day) return null;
    return {
      from: Math.min(current.from, day),
      to: Math.max(current.from, day),
    };
  }

  return { from: day, to: day };
}
