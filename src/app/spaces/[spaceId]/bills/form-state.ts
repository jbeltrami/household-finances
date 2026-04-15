// Shared form state for the create and update bill template actions.
// Lives in its own file because `"use server"` files can only export
// async functions — types and constants must be exported elsewhere.

export type FormState = { error: string | null };

export const initialFormState: FormState = { error: null };
