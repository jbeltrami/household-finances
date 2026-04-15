// Manifest / barrel for savings route server actions. Each action lives
// in its own file under ./actions/ with its own "use server" directive.
// This file is plain TypeScript — do NOT add "use server" to it, since a
// "use server" file can only export async functions.

export { createSavingsFund } from "./actions/create-savings-fund";
export { updateSavingsFund } from "./actions/update-savings-fund";
export { createSavingsContribution } from "./actions/create-savings-contribution";
export { updateSavingsContribution } from "./actions/update-savings-contribution";
export { deleteSavingsContribution } from "./actions/delete-savings-contribution";
