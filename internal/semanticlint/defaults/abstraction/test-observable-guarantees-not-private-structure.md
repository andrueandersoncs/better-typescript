---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Test observable guarantees, not private structure

Test by executing the real subject through its public contract. Avoid excessive mocking, copied implementations, source-text checks, and implementation-detail assertions, so internal refactoring need not rewrite tests.
