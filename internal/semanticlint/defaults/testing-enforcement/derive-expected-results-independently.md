---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Derive expected results independently

Expected results must not call the behavior under test or reproduce its implementation line for line. Use independently specified examples, invariants, or domain constants so the same defect cannot determine both actual and expected values.

Shared contract constants are allowed when they do not perform the behavior being verified.