---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Use test data that makes behavior obvious

Report test data that hides the value or property responsible for the behavior being checked. For example, report `const user = makeUser()` in a test whose outcome depends on the user being suspended; use `makeUser({ status: "suspended" })` so the relevant condition is visible. Do not report incidental data that does not affect the behavior, or a factory call when the important data is already obvious from the test.
