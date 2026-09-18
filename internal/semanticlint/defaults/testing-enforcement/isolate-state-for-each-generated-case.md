---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Isolate state for each generated case

Reset mutable state for every property predicate execution, including shrinking. When the subject mutates generated input, preserve an independent original value for assertions and replay.

Outer test setup is insufficient when cases can observe mutations from earlier generated or shrink attempts.