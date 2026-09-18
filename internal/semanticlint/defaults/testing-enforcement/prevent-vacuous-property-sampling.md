---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Prevent vacuous property sampling

Filters, preconditions, conditional assertions, and run budgets must leave enough meaningful cases to exercise the stated property. Do not let rejected inputs, trivial generators, or success-returning branches avoid the behavior and assertions.

Use runner statistics or the visible generator domain when available; do not infer vacuity from a necessary narrow precondition alone.