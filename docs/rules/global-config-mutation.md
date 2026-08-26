# global-config-mutation

## What it does

Reports assignment and delete targets whose unwrapped source text, after removing spaces, starts with `process.env`, `process['env']`, `process["env"]`, or a `globalThis.`-prefixed equivalent. The report says: “Avoid mutating process.env in tests; provide deterministic Config instead. Use ConfigProvider.fromUnknown or a test configuration service.” Reads are allowed.

## When to use it

Use it to keep test configuration deterministic.

## Conformant

```ts
const mode = process.env.MODE
```

## Non-conformant

```ts
process.env.MODE = "test"
```
