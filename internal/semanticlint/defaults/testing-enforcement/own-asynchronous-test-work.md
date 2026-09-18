---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Own asynchronous test work

Every asynchronous operation and assertion started by a test must be awaited, returned, joined, or registered with a lifecycle mechanism that propagates failure. Do not start detached work or use async callbacks through APIs such as `forEach` that ignore their result.

Report only when changed test code can finish before relevant asynchronous work or assertions complete.