import { createRequire } from "node:module";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const require = createRequire(import.meta.url);

// eslint-plugin-react's default `version: "detect"` walks the filesystem to
// find React, and that path calls `context.getFilename()` — removed in ESLint
// 10. The plugin's newest release (7.37.5) peers at `^9.7`, so there is no
// version of it that supports ESLint 10 and no upstream fix to wait for.
//
// Pinning the version short-circuits detection before it reaches the broken
// call (see getReactVersionFromContext: it only calls detectReactVersion when
// the setting is literally "detect"). Read from React's own package.json
// rather than hardcoded, so it cannot drift out of date.
const reactVersion = require("react/package.json").version;

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: { react: { version: reactVersion } },
  },
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Not application source: the teaching workspace's standalone lesson
    // assets and the ticket files. Linting them fails on rules that assume a
    // React/Next module context.
    "docs/**",
    ".scratch/**",
  ]),
]);

export default eslintConfig;
