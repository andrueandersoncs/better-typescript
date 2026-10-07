---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Isolate state for each generated case

Reset mutable state for every property predicate execution, including shrinking.

Outer test setup is insufficient when cases can observe mutations from earlier generated or shrink attempts.
