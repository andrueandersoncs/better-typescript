# Terminal delegated yield without return

- Status: prospective
- Status-source: agent
- Rule candidate: none
- Created: 2026-09-08
- Updated: 2026-09-08

## Invariant

Do not end an Effect generator with a bare delegated `yield*` expression. Write `return yield* expression` so the generator explicitly returns the delegated operation's success value. A non-terminal bare `yield*` remains allowed when execution continues and the yielded value is intentionally unused.

## Detection

Find a resolved `Effect.gen` or `Effect.fn` generator whose final statement is an expression statement containing a delegated `yield*`. Report that statement unless it is already under a `return`.

## Evidence

- Snippets:
  - [011](../snippets/011-terminal-yield-without-return.md)
- Allowed nearby:
  - A non-terminal bare `yield*` followed by another statement
  - A terminal `return yield*` that propagates the delegated success value

## Overlap

`prefer-direct-yield` removes a temporary Effect binding before `yield*` but explicitly permits direct yielding when a result is unused. `discarded-effect-operation` accepts yielded Effects. `no-trivial-effect-fn` owns an exact single-call forwarding wrapper after it uses `return yield*`, where collapsing the wrapper is the more direct remedy. None requires a terminal delegated yield to be returned.

## Decision

- 2026-09-08: Prospective from one snippet; the terminal shape and replacement are clear, but independent evidence is still required.
