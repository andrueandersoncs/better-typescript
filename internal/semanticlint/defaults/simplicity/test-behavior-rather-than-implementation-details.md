---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Test behavior rather than implementation details

Test important observable outcomes, boundaries, and regressions by executing the real subject. Avoid redundant cases, excessive mocking, copied implementations, source-text checks, implementation-detail assertions, and test utilities more complicated than the behavior they support.
