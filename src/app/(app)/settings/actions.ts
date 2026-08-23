// Barrel for settings server actions. Each action lives in its own
// file under ./actions/ with its own `"use server"` directive.
// Do NOT add `"use server"` here — a barrel must stay a plain module.

export { renameSpace } from "./actions/rename-space";
export { setMonthlyReportEmailEnabled } from "./actions/set-monthly-report-email-enabled";
export { setOverdueAvisoEnabled } from "./actions/set-overdue-aviso-enabled";
export { sendTestAviso } from "./actions/send-test-aviso";
export type { TestAvisoResult } from "./_types";
