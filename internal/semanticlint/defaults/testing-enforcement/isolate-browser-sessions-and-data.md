---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Isolate browser sessions and data

Browser tests must not depend on another test's cookies, storage, authenticated session, or mutable server data. Reusable authentication setup is allowed only when each test receives an isolated context and cannot observe mutations from another test.

Report shared state only when it can affect behavior or execution order.