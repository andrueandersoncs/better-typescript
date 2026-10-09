---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Test observable guarantees, not private structure

Report a test that substitutes copied logic, source-text checks, private-member assertions, or excessive mocks for executing the real subject through its public contract. Examples: expecting `service["cache"]` to be a `Map`, or reading a source file to require `Effect.retry`. Do not report a test that observes a promised result through the public API, including one that uses a boundary mock only to make that observable behavior deterministic.
