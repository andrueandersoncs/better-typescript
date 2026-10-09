---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Keep expected failures out of the defect channel

Apply this policy only to Effect code that turns a failure into a defect. A file that never calls `Effect.die`, `Effect.dieMessage`, `orDie`, `Layer.orDie`, or `throw` inside an Effect cannot violate this rule.

Expected failures are conditions a caller could reasonably handle: a lookup that finds nothing, invalid input, a missing record, a refused permission, a network, socket, or connection failure, an unavailable external service, or a storage or migration error. Keep them in the error channel with `Effect.fail(new SomeError(...))` so callers can use `Effect.catchTag`. Report any of these shapes, whatever the defect payload is (a string, an `Error`, or a tagged class):

- `Effect.die(...)` or `Effect.dieMessage(...)` on an expected branch, such as `if (found === undefined) return yield* Effect.die("missing " + key)`;
- `Effect.orDie` or `Effect.orDieWith` applied to an operation that can fail for an expected reason, including as the final argument of `Effect.fn(..., Effect.orDie)` around opening a connection or calling a client;
- `Layer.orDie(someLayer)` on a layer whose construction can fail for an expected reason, such as connecting to or migrating a database;
- `throw` of a known domain or I/O error inside `Effect.gen`, `Effect.sync`, or `Effect.map`.

Report these even when the defect is used to fit a signature or interface that expects `never` errors. Do not report `Effect.fail` with any error type, `Effect.tryPromise` or `Effect.try` (with or without `catch`), recovery with `Effect.catchTag`, or `Effect.die` for a true invariant violation or programmer bug that no caller could handle.
