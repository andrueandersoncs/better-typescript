# Terminal yield without return

- ID: 011
- Added: 2026-09-08
- Source: paste
- Path: none

## Why it is bad

I don't like this because it just does yield* and doesn't return anything which feels kinda wrong to me

## Code

```ts
yield* ApplicationBun.serve({
    application: ReservationApplication,
    handlers: ReservationHandlers,
    runtime,
    services: InventorySqlite,
    initialize,
  })
```

## Analysis

### Shape: Terminal delegated yield without return

- Observable shape: A generator's final statement is a bare delegated `yield*` expression, so the generator does not return the delegated operation's success value.
- Existing rules: `prefer-direct-yield` only removes a temporary Effect binding before `yield*`; `discarded-effect-operation` permits yielded Effects; `no-trivial-effect-fn` only owns single-call forwarding wrappers after they use `return yield*`.
- Pattern: [terminal-yield-without-return](../patterns/terminal-yield-without-return.md)
- Emergence: new-prospective
- Reason: The final-statement shape is reusable, AST-visible, and has the direct replacement `return yield* expression`; a non-terminal bare `yield*` remains allowed when execution continues.
