# no-unsupported-d1-transactions

## What it does

Reports execution of `withTransaction` on a receiver proven to be `@effect/sql-d1`'s `D1Client`, including use as a resolved Effect `pipe` or `Function.pipe` stage. D1's inherited transaction acquirer always defects; a `SqlClient`-erased receiver, an incidental property read, and supported backend clients are not reported.

`D1Client.batch` is the supported atomic operation for a fixed collection of D1 statements. It cannot automatically replace an arbitrary Effect transaction body.

## When to use it

Use it for code that can receive a Cloudflare D1 client and must not defer failure until the transaction runs.

## Conformant

```ts
import { D1Client } from "@effect/sql-d1"

declare const d1: D1Client.D1Client
const results = d1.batch([])

void results
```

## Non-conformant

```ts
import { Effect } from "effect"
import { D1Client } from "@effect/sql-d1"

declare const d1: D1Client.D1Client
const transaction = d1.withTransaction(Effect.void)

void transaction
```
