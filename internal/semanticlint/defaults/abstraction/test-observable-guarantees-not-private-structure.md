---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Test observable guarantees, not private structure

Cover normal behavior, boundary conditions, failures, and promised invariants through the public contract. Tests should allow internal refactoring without unnecessary rewrites. Shared contract tests can help verify multiple implementations.
