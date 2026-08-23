// Shared types for the settings actions. A `"use server"` file may only
// export async functions, so anything that is not one lives here.

export type TestAvisoResult =
  | { kind: "sent"; count: number }
  | { kind: "nothing-vencida" }
  | { kind: "error"; message: string };
