# no-unsafe-effect-apis

## What it does

Reports resolved identifiers in value and ordinary type-reference positions, except identifiers whose direct parent is a supported import/export form or `TypeQuery`. It also reports property accesses and string-literal element accesses, including those inside type queries, when the resolved Effect symbol name contains `unsafe` case-insensitively.

## When to use it

Use this rule when code must handle safe Effect results explicitly instead of calling unsafe Effect APIs.

## Conformant

```ts
import { Effect } from "effect"

export const result = Effect.runSync()
```

## Non-conformant

```ts
import { Effect } from "effect"

export const result = Effect.unsafeRunSync()
```
