---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Test promised laws against their equivalence

For promised identity, associativity, idempotency, normalization, round trips, or wrapper transparency, test against the documented equivalence. Shared contract tests may cover multiple implementations.
