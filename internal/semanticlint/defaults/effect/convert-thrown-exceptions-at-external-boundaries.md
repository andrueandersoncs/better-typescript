---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Convert thrown exceptions at external boundaries

Apply this policy to effectful application operations that may fail, not pure calculations. Report an external boundary that can throw and is invoked so its exception can escape an effectful application operation, rather than being converted with `Effect.try` or `Effect.tryPromise`, such as a direct `client.getUser(id)` in a workflow instead of `Effect.try(() => client.getUser(id))`. Do not report pure calculations or a boundary already converted with `Effect.try` or `Effect.tryPromise`.
