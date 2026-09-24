---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Model failures with Effect

Application functions below executable and test boundaries that perform effects or expose expected operational failures must return `Effect<A, E>`. Expected operational failures belong in the typed error channel as tagged errors. Callers must compose or handle them with Effect operators.

Do not report a deterministic function such as `verifyOutcome` that returns domain or check results without performing an effect or exposing an operational failure.

Catch thrown exceptions only at external boundaries and convert them with
`Effect.try` or `Effect.tryPromise`. No exception may escape an application
function.

Run Effects only at executable and test boundaries.

Report an effectful application operation below those boundaries when it throws, performs the effect outside `Effect`, or erases an expected failure from the typed error channel.
