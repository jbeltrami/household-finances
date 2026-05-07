// Row shape consumed by the reports list. A "generated" row maps to
// an existing monthly_reports record and offers a download. A
// "missing" row is a past month with data but no report yet, so it
// offers a generate button.

export type GeneratedRow = {
  kind: "generated";
  reportId: string;
  year: number;
  month: number;
  generatedAt: string;
};

export type MissingRow = {
  kind: "missing";
  year: number;
  month: number;
};

export type ReportListRow = GeneratedRow | MissingRow;
