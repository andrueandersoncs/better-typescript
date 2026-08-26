# raw-fetch-outside-adapter

## What it does

Reports calls whose unresolved callee text is exactly `fetch`, `globalThis.fetch`, `window.fetch`, or `self.fetch`, unless the file has an exact `adapter`/`adapters` path segment or an exact textual `Effect.tryPromise`/`tryPromise` call ancestor is reached before crossing a non-immediate function-like ancestor. An expression-body callback can be exempt while a block-body callback reports.

## When to use it

Use it to keep raw network access at explicit boundaries. Files in `adapter` or `adapters` directories are allowed.

## Conformant

```ts
declare const Effect: { tryPromise<A>(f: () => Promise<A>): unknown }
Effect.tryPromise(() => fetch("/ok"))
```

## Non-conformant

```ts
fetch("/bad")
```
