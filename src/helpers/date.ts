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
