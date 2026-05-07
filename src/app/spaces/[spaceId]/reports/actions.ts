// Barrel for reports server actions. Each action lives in its own
// file under ./actions/ with its own `"use server"` directive.
// Do NOT add `"use server"` here — a barrel must stay a plain module.

export { generateReport } from "./actions/generate-report";
export { generateMissingReports } from "./actions/generate-missing-reports";
export { downloadReport } from "./actions/download-report";

export type { GenerateMissingResult } from "./actions/generate-missing-reports";
