# no-manual-effect-error-tag

## What it does

Reports manual `_tag` comparisons and switches inside `Effect.catch`, `Effect.catchAll`, and `Effect.catchIf` handlers.

## When to use it

Use `Effect.catchTag`, `Effect.catchTags`, `Effect.catchReason`, or `Effect.catchReasons` for selective recovery.

## Conformant

```ts
program.pipe(Effect.catchTag("NotFound", recover))
```

## Non-conformant

```ts
Effect.catch((error) => error._tag === "NotFound" ? recover : Effect.fail(error))
```
