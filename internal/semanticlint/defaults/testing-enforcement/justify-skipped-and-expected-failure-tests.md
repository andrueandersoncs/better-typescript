---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Justify skipped and expected-failure tests

A skipped, todo, conditional, or expected-failure test must have a specific reason and remain appropriate for the behavior it covers.

Report only recognized test-runner declarations. Do not report unrelated properties named `skip` or `todo`.
