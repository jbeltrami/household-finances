// Shared form state for the financing server actions. Lives outside the
// `"use server"` files since those may only export async functions.

export type FormState = { error: string | null };

export const initialFormState: FormState = { error: null };
