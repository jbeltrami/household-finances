// Barrel for the Categoria server actions. Each action lives in its own
// file under ./actions/ with its own `"use server"` directive.
// Do NOT add `"use server"` here — a barrel must stay a plain module.

export { createCategory } from "./actions/create-category";
export { updateCategory } from "./actions/update-category";
export { setCategoryActive } from "./actions/set-category-active";
export { deleteCategory } from "./actions/delete-category";
