---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Use test data that makes behavior obvious

Report test data that hides the value responsible for the behavior being checked. Report an opaque code, abbreviation, or magic literal that decides the outcome, such as `const item = { status: "x" }`, when neither the value nor the binding name states the condition, even if the implementation compares against that same literal; write `const expiredItem = { status: "expired" }`. Report `const user = makeUser()` in a test whose outcome depends on the user being suspended; use `makeUser({ status: "suspended" })`. Do not report incidental data that does not affect the behavior, or a factory call when the important data is already obvious from the test.
