// Shared form state for monthly view server actions that use useActionState.
// Same shape as bills/form-state — kept local for now since the two features
// are independent. If a third place needs it, we can hoist to src/lib/.

export type FormState = { error: string | null };

export const initialFormState: FormState = { error: null };
