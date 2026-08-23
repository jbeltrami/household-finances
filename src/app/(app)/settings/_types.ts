// Shared types for the settings actions. A `"use server"` file may only
// export async functions, so anything that is not one lives here.

export type TestAlertResult =
  | { kind: "sent"; count: number }
  | { kind: "nothing-overdue" }
  | { kind: "error"; message: string };
