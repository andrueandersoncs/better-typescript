---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Prevent vacuous test success

A test must not pass without exercising and asserting its intended condition. Reject empty iterations, early returns, swallowed exceptions, conditional assertions whose branch need not run, and rejection tests that also pass when the operation succeeds.

Recognized assertion helpers and runner guarantees may establish that the intended path executes.