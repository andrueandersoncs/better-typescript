---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Convert thrown exceptions at external boundaries

Apply this policy to effectful application operations that may fail, not pure calculations.

Catch thrown exceptions at external boundaries and convert them with `Effect.try` or `Effect.tryPromise`. Do not let exceptions escape effectful application operations.
