---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Test observable guarantees, not private structure

Test normal behavior, boundaries, failures, forbidden side effects, regressions, and promised invariants by executing the real subject through its public contract. For promised identity, associativity, idempotency, normalization, round trips, or wrapper transparency, test against the documented equivalence; shared contract tests may cover multiple implementations. Keep a module's core behavior testable without starting the entire application, but also test important integrations. Avoid redundant cases, excessive mocking, copied implementations, source-text checks, implementation-detail assertions, and test utilities more complicated than their supported behavior so internal refactoring need not rewrite tests.
