import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// The helper suites all import by relative path and never needed this, but a
// test that reaches an app module gets `@/` imports whether it wants them or
// not — the module under test uses them. Mirrors tsconfig's `paths` so the
// two agree on what `@/` means.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
