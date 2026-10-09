---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Test behavior, boundaries, failures, and integrations

Report a test suite that covers only a normal path while the behavior it tests has untested relevant boundaries, failures, forbidden side effects, regressions, promised invariants, or important integrations. Examples: testing `parseOrder` only with valid input despite an error contract, or testing a save result without checking that a failed write is surfaced. Do not report an absent category that the behavior does not have, or a suite that exercises the relevant behavior through those cases.
