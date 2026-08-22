// Shared form state for the Categoria actions. Its own file because a
// `"use server"` module may only export async functions.

export type FormState = { error: string | null };

export const initialFormState: FormState = { error: null };
