---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Run Effects only at application boundaries

Call `runPromise`, `runSync`, create runtimes, or otherwise execute Effects only in application entry points, framework integrations, scripts, and test infrastructure. Library code must return Effects and never execute them secretly.
