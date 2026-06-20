// Barrel for financing server actions. Each action lives in its own file
// under ./actions/ with its own "use server" directive; this file only
// re-exports them (no "use server" here — a barrel may export non-functions).

export { createFinancing } from "./actions/create-financing";
export { deactivateFinancing } from "./actions/deactivate-financing";
export { addExtraPayment } from "./actions/add-extra-payment";
export { deleteExtraPayment } from "./actions/delete-extra-payment";
export { toggleInstallmentPaid } from "./actions/toggle-installment-paid";
