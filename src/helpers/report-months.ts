// Which past months have anything to report.
//
// Kept out of `reports.ts` so callers — and tests — can reach it without
// dragging the @react-pdf/renderer chain in behind it. Same reason
// `category-reports.ts` sits apart. See CLAUDE.md → "@react-pdf/renderer
// is server-only".

import { addMonthsYm } from "./date";
import { installmentWindow } from "./ledger";

// The pure half of "which past months have anything to report".
//
// Everything arrives as plain data: the month the space started, the last
// month worth considering, the months that already carry a materialized
// entry or Receita, and each active Conta recorrente with how much of its
// parcelamento is paid. Out come the months, newest first.
//
// The prepayment arithmetic that used to sit inline here is gone — it is
// `installmentWindow`'s, and having a second copy of it was how this list
// and the monthly view could quietly disagree about when a parcelamento
// stops.
export function foldNonEmptyMonths(input: {
  spaceStartYm: string;
  endYm: string;
  datedMonths: string[];
  templates: {
    installments_total: number | null;
    installments_start_month: string | null;
    paidCovered: number;
    paidRows: number;
  }[];
}): { year: number; month: number }[] {
  const { spaceStartYm, endYm, datedMonths, templates } = input;

  const yms = new Set<string>(datedMonths);

  for (const tpl of templates) {
    const window = installmentWindow(tpl, tpl.paidCovered, tpl.paidRows);
    // A parcelamento with no start month cannot be placed on the calendar,
    // so it contributes no months rather than every month.
    if (window.kind === "empty") continue;

    let startYm = spaceStartYm;
    let lastYm = endYm;
    if (window.kind === "bounded") {
      if (window.startYm > startYm) startYm = window.startYm;
      if (window.endYm < lastYm) lastYm = window.endYm;
    }

    let cursor = startYm;
    while (cursor <= lastYm) {
      yms.add(cursor);
      cursor = addMonthsYm(cursor, 1);
    }
  }

  return Array.from(yms)
    .filter((ym) => ym >= spaceStartYm && ym <= endYm)
    .sort()
    .reverse()
    .map((ym) => {
      const [y, m] = ym.split("-").map(Number);
      return { year: y, month: m };
    });
}
