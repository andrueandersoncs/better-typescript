---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Isolate browser sessions and data

Report browser tests that share cookies, storage, an authenticated session, or mutable server data when another test can observe a mutation or execution order can change behavior. Examples include reusing one `page` while tests modify storage, or updating the same server-side user in parallel.

Do not report reusable authentication setup when every test receives an isolated context and cannot observe another test's mutations. Do not report shared state that cannot affect behavior or execution order.
