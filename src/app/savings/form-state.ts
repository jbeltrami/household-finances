// Shared form state for the savings server actions. Lives in its own
// file because `"use server"` files may only export async functions.

export type FormState = { error: string | null };

export const initialFormState: FormState = { error: null };
