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

// Build a 6×7 = 42-cell calendar grid for the given year/month, Sunday-first.
// Always returns 42 cells so the grid height is stable across months. Cells
// from the previous and next month are marked `inCurrentMonth: false` so the
// UI can fade them.
export function buildCalendarGrid(
  year: number,
  month: number
): CalendarCell[] {
  const firstOfMonth = new Date(year, month - 1, 1);
  // JS Date.getDay() is already 0=Sunday..6=Saturday, which is the column
  // order the grid wants — so there is nothing to convert. This used to
  // rotate by one to push Monday into column 1; see DAY_HEADERS in
  // CalendarStrip.tsx for why the calendar no longer disagrees with the
  // rest of the app about where a week starts.
  const startDay = firstOfMonth.getDay();

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

// How a day button in the grid is found from outside the calendar.
//
// Both ends of that contract live here rather than one in the calendar and
// one in whoever is looking: `MonthlyViewClient` hands focus back to a day
// button when the Período is cleared, and an attribute renamed in the JSX
// without the selector following would break that silently — focus would
// simply fall to the top of the document again, which is the bug the focus
// move exists to prevent, and nothing would fail.
export const CALENDAR_DAY_ATTR = "data-calendar-day";

export function calendarDaySelector(day: number): string {
  return `[${CALENDAR_DAY_ATTR}="${day}"]`;
}
