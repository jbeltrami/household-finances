// Manifest / barrel file for bill template server actions.
//
// Each action lives in its own file under ./actions/ with its own
// `"use server"` directive. This file simply re-exports them so callers
// can `import { createBillTemplate, ... } from "@/app/bills/actions"`.
//
// IMPORTANT: do NOT add `"use server"` here. A `"use server"` file may
// only export async functions, but a barrel re-export of actions works
// fine without the directive — the actions remain server actions because
// their source files are marked.

export { createBillTemplate } from "./actions/create-bill-template";
export { updateBillTemplate } from "./actions/update-bill-template";
export { deactivateBillTemplate } from "./actions/deactivate-bill-template";
