---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Give each resource an owner that releases it

Report an acquired runtime or resource when this file leaves its owner unclear or allows it to outlive cleanup. Examples: `const server = createServer()` with no enclosing `server.close()`, or `new Runtime()` returned without a release path. Do not report values that need no acquisition, or a resource whose creator, owner, and release are explicit and scoped, such as `Effect.acquireRelease(acquire, release)` or `try { ... } finally { resource.close() }`.
