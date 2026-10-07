---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Do not commit focused tests

Do not commit focused tests.

Report only recognized test-runner declarations. Do not report unrelated properties named `only`.
