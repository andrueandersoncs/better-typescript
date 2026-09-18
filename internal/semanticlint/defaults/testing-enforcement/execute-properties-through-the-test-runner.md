---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Execute properties through the test runner

Property tests must execute and propagate their result to the test runner. Await asynchronous property execution. When an API returns failure details instead of throwing, inspect those details and fail the test explicitly.

Constructing, sampling, or checking a property without propagating failure is not evidence of correctness.