// Today's date as a "YYYY-MM-DD" string in the server's local timezone.
// Used for string-comparison against Postgres `date` columns (which come
// back as "YYYY-MM-DD") without going through Date parsing and its
// timezone traps.
export function todayYmd(): string {
  const now = new Date();
  const yyyy = String(now.getFullYear()).padStart(4, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Current year and month as a "YYYY-MM" string, matching the value
// format of a native <input type="month"> control.
export function currentYearMonth(): string {
  const now = new Date();
  const yyyy = String(now.getFullYear()).padStart(4, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

// Format a local Date as "YYYY-MM-DD" without going through UTC.
export function formatDateYmd(d: Date): string {
  const yyyy = String(d.getFullYear()).padStart(4, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Parse the year and month out of a "YYYY-MM-DD" string without timezone
// shifts. Returns null if the string isn't shaped right.
export function parseYearMonthFromYmd(
  ymd: string
): { year: number; month: number; day: number } | null {
  const parts = ymd.split("-");
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map(Number);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) {
    return null;
  }
  return { year: y, month: m, day: d };
}

// Return the inclusive "YYYY-MM-DD" bounds for the given calendar month.
// Example: getMonthRange(2026, 4) → { start: "2026-04-01", end: "2026-04-30" }.
// The end clamps to the actual last day of the month, handling leap years.
export function getMonthRange(
  year: number,
  month: number
): { start: string; end: string } {
  const lastDay = new Date(year, month, 0).getDate();
  const yyyy = String(year).padStart(4, "0");
  const mm = String(month).padStart(2, "0");
  return {
    start: `${yyyy}-${mm}-01`,
    end: `${yyyy}-${mm}-${String(lastDay).padStart(2, "0")}`,
  };
}

// Offset a "YYYY-MM" string by N months, returning a "YYYY-MM" string.
// Kept string-based to avoid timezone pitfalls with Postgres `date`
// columns.
export function addMonthsYm(ym: string, offset: number): string {
  const [y, m] = ym.split("-").map(Number);
  const absolute = y * 12 + (m - 1) + offset;
  const year = Math.floor(absolute / 12);
  const month = (absolute % 12) + 1;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
}

// "YYYY-MM" string for a given year/month.
export function yearMonthKey(year: number, month: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
}

// Offset a "YYYY-MM-DD" string by N months, preserving the day-of-month
// but clamping it to the target month's last day (e.g. the 31st + 1 month
// from January lands on Feb 28/29). String-based to dodge timezone traps —
// used to walk an amortization schedule from its start date.
export function addMonthsToYmd(ymd: string, offset: number): string {
  const parsed = parseYearMonthFromYmd(ymd);
  if (!parsed) return ymd;
  const absolute = parsed.year * 12 + (parsed.month - 1) + offset;
  const year = Math.floor(absolute / 12);
  const month = (absolute % 12) + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const day = Math.min(parsed.day, daysInMonth);
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Format a year/month as a human-readable Brazilian Portuguese label,
// e.g. (2026, 4) → "abril de 2026".
export function formatMonthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

// Default "YYYY-MM-DD" date for a create-form whose page is viewing the
// given year/month. When that's the current month we want today's date so
// new entries land on the present day; for any other month today wouldn't
// fall inside it, so we fall back to the first of the viewed month (which
// keeps the entry visible on the page the user is on).
export function defaultEntryDate(year: number, month: number): string {
  const today = todayYmd();
  const parsed = parseYearMonthFromYmd(today);
  if (parsed && parsed.year === year && parsed.month === month) {
    return today;
  }
  return getMonthRange(year, month).start;
}

// Format a year/month into a "YYYY-MM-DD" string, clamping the day to
// the last day of the month when it's larger (e.g. dueDay 31 in February
// becomes the 28th or 29th).
export function dueDateFor(
  year: number,
  month: number,
  dueDay: number | null
): string | null {
  if (dueDay == null) return null;
  const daysInMonth = new Date(year, month, 0).getDate();
  const day = Math.min(dueDay, daysInMonth);
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// The day-of-month out of a "YYYY-MM-DD" string, or null if it isn't shaped
// like one. Read off the string rather than parsed into a Date, because
// `new Date("2026-04-01")` is UTC midnight and formats as 31 March in São
// Paulo. Returns a number so callers can key a calendar grid by it.
export function dayOfMonthFromYmd(ymd: string): number | null {
  const day = parseInt(ymd.split("-")[2], 10);
  return Number.isInteger(day) ? day : null;
}
