// Barrel for monthly-view server actions. Each action lives in its
// own file under ./actions/ with its own `"use server"` directive.
// Do NOT add `"use server"` here — a barrel must stay a plain module.

export { toggleEntryPaid } from "./actions/toggle-entry-paid";
export { overrideEntryAmount } from "./actions/override-entry-amount";
export {
  skipEntryOccurrence,
  unskipEntryOccurrence,
} from "./actions/skip-entry-occurrence";
export { createOneOffEntry } from "./actions/create-one-off-entry";
export { updateEntry } from "./actions/update-entry";
export { deleteEntry } from "./actions/delete-entry";

export { createIncomeEntry } from "./actions/create-income-entry";
export { updateIncomeEntry } from "./actions/update-income-entry";
export { toggleIncomeReceived } from "./actions/toggle-income-received";
export { deleteIncomeEntry } from "./actions/delete-income-entry";

export { unlockMonth } from "./actions/unlock-month";

// Re-export the shared target type so client components can type
// their action calls without deep-importing from `_types`.
export type { EntryMutationTarget } from "./_types";
