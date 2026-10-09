---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Separate test setup, action, and assertions

Report a test whose statements do not run in order: arrange inputs, perform the action under test, then assert. Report an assertion placed before the action, including a precondition check on arranged data such as `expect(input.locked).toBe(true)` before `unlock(input)`; setup or another action after an assertion; or the action called inside `expect(...)` while setup or assertions surround it. Do not report a test whose assertions all follow the action, including assertions on the original input made after it, a test missing one phase, or a short test without blank lines between phases.
