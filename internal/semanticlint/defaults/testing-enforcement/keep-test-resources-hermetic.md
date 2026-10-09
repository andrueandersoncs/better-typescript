---
globs:
  - "package.json"
  - "**/*config*.{ts,js,mjs,cjs,json}"
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Keep test resources hermetic

Report a test using a database, file, port, queue, account, or external service when its resource identity is shared so tests can mutate it or depend on execution order. Examples include a fixed database name, port `3000`, or shared account used by multiple tests.

Do not report a shared read-only resource when tests cannot mutate it or depend on execution order.
