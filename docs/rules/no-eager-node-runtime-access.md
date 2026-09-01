# no-eager-node-runtime-access

## What it does

Reports named, aliased, and namespace-import calls from `node:os`, `os`, `node:fs`, `fs`, `node:fs/promises`, and `fs/promises` when they run during module initialization. This includes IIFEs, static fields and blocks, computed class member names, and decorator expressions. Calls in non-invoked function bodies, generator bodies, and instance field initializers are allowed.

The report says: “Avoid Node runtime access during module initialization. Defer the call inside an Effect. Pass the result directly; use a service or Layer only when the value must be shared or replaced in tests.”

## When to use it

Use it to keep ambient state reads and file system work inside the Effect runtime.

## Conformant

```ts
import { mkdtempDisposableSync } from "node:fs"
import { tmpdir } from "node:os"
import { Effect } from "effect"

export const temporaryDirectory = Effect.gen(function* () {
  return yield* Effect.sync(() =>
    mkdtempDisposableSync(`${tmpdir()}/example-`),
  )
})
```

## Non-conformant

```ts
import { tmpdir } from "node:os"

export const temporaryDirectory = tmpdir()
```
