// Barrel for settings server actions. Each action lives in its own
// file under ./actions/ with its own `"use server"` directive.
// Do NOT add `"use server"` here — a barrel must stay a plain module.

export { renameSpace } from "./actions/rename-space";
export { setMonthlyReportEmailEnabled } from "./actions/set-monthly-report-email-enabled";
export { saveWhatsAppPhone } from "./actions/save-whatsapp-phone";
export { setWhatsAppEnabled } from "./actions/set-whatsapp-enabled";
export { sendWhatsAppTestMessage } from "./actions/send-whatsapp-test-message";
