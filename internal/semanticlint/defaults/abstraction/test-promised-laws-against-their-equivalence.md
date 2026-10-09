---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Test promised laws against their equivalence

When a contract promises an identity, associativity, idempotency, normalization, round trip, or wrapper transparency, report a test that checks only one implementation-specific representation instead of the documented equivalence. Examples: compare `normalize(normalize(value))` with `normalize(value)`, or decode an encoded order and compare by the stated order equivalence. Do not report ordinary example tests for behavior with no promised law. Shared contract tests may cover multiple implementations.
