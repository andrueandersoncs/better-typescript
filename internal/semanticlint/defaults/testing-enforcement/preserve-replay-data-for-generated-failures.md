---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Preserve replay data for generated failures

Report a generated-test failure path that discards the seed or other replay data needed to reproduce the failure. For example, catching a property-check error and throwing a new error without its seed, or logging only `property failed`.

Do not report a failure path that retains the seed or equivalent replay data needed to reproduce the generated case.
