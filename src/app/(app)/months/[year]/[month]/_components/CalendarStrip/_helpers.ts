// Helpers private to the CalendarStrip component. Generates the 6×7 = 42-cell
// month grid that the calendar displays. Lives next to the component because
// it's not used anywhere else.

import { nextMonth, prevMonth } from "../../_helpers";

export type CalendarCell = {
  year: number;
  month: number;
  day: number;
  inCurrentMonth: boolean;
};

// Build a 6×7 = 42-cell calendar grid for the given year/month, Monday-first.
// Always returns 42 cells so the grid height is stable across months. Cells
// from the previous and next month are marked `inCurrentMonth: false` so the
// UI can fade them.
export function buildCalendarGrid(
  year: number,
  month: number
): CalendarCell[] {
  const firstOfMonth = new Date(year, month - 1, 1);
  // JS Date.getDay(): 0=Sunday..6=Saturday. Convert to 0=Monday..6=Sunday so
  // Monday lands in column 1.
  const startDay = (firstOfMonth.getDay() + 6) % 7;

  // Last day of THIS month: new Date(year, month, 0) gives the last day of
  // (month - 1) in 1-indexed terms. Since `month` is 1-indexed, passing it
  // directly with day=0 gives the last day of the current month.
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells: CalendarCell[] = [];

  if (startDay > 0) {
    const prev = prevMonth(year, month);
    const daysInPrev = new Date(prev.year, prev.month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      cells.push({
        year: prev.year,
        month: prev.month,
        day: daysInPrev - i,
        inCurrentMonth: false,
      });
    }
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ year, month, day: d, inCurrentMonth: true });
  }

  const remaining = 42 - cells.length;
  const next = nextMonth(year, month);
  for (let d = 1; d <= remaining; d++) {
    cells.push({
      year: next.year,
      month: next.month,
      day: d,
      inCurrentMonth: false,
    });
  }

  return cells;
}
