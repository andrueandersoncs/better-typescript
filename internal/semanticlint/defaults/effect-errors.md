---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Model failures with Effect

Effectful application operations return `Effect<A, E>`: model expected
failures as tagged errors in the typed error channel, and compose or handle
them with Effect operators. Deterministic helpers, including pure validation,
remain ordinary functions; represent pure expected failures as data rather
than wrapping a helper in Effect because application code calls it.

Catch thrown exceptions at external boundaries and convert them with
`Effect.try` or `Effect.tryPromise`. Do not let exceptions escape effectful
application operations. Run Effects only at executable and test boundaries.
