// Form state for the ideal-budget parameter form. Lives in its own
// file because `"use server"` files can only export async functions.

export type FormState = { error: string | null };

export const initialFormState: FormState = { error: null };
