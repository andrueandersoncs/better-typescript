---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Model failures with Effect

Application functions must return `Effect<A, E>`. Expected failures belong in
the typed error channel as tagged errors. Callers must compose or handle them
with Effect operators.

Catch thrown exceptions only at external boundaries and convert them with
`Effect.try` or `Effect.tryPromise`. No exception may escape an application
function.

Run Effects only at executable and test boundaries.
