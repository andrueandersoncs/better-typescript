---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Separate test setup, action, and assertions

Report a test that interleaves setup, the action under test, and assertions instead of keeping those phases distinct. For example, report a test that calls `createOrder()` inside an `expect(...)` while setup continues before or after that assertion. Keep arranging test data, running the action, and checking results as separate steps. Do not report a test merely because one phase is absent or because a short, self-contained phase has no blank line.
