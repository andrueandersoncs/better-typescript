---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Justify skipped and expected-failure tests

Report a recognized test-runner declaration that skips, marks todo, runs conditionally, or expects failure without a specific reason, or whose reason no longer fits the behavior it covers. Examples include unexplained `test.skip(...)`, `test.todo(...)`, or expected-failure declarations.

Do not report unrelated object properties such as `job.skip` or `task.todo`.
