---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Test resource lifecycle behavior

Report a test of behavior that depends on a resource lifecycle when it does not test cleanup, interruption, or resource ownership as applicable. For example, a test that opens a connection and asserts success but never checks release on completion or interruption.

Do not report behavior that does not depend on a resource lifecycle.
