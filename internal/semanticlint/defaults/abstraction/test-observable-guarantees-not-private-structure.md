---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Test observable guarantees, not private structure

Cover normal behavior, boundary conditions, failures, forbidden side effects, and promised invariants through the public contract. When an interface promises identity, associativity, idempotency, normalization, round trips, or wrapper transparency, test that law using its documented equivalence. Tests should allow internal refactoring without unnecessary rewrites. Shared contract tests can help verify multiple implementations.
