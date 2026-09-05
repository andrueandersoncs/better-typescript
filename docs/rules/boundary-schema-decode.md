# boundary-schema-decode

## What it does

Reports promotion of data from resolved `JSON.parse` or Web `Request.json()` into a concrete domain type without decoding it. A local value may remain `unknown` at a raw adapter boundary. A decoder must consume that same parsed value; an unrelated decoder does not make another value safe. Web `Response.json()` belongs to `http-response-validation`, so it is not reported here.

Raw `unknown` aliases and `Schema.Json` remain valid. An `unknown` field inside a domain record does not make the whole record raw. Direct reassignment ends a tracked parsed-value relationship.

## When to use it

Use it at request and JSON boundaries before representing input as a domain value.

## Conformant

```ts
import { Effect, Schema } from "effect"

const Person = Schema.Struct({ name: Schema.String })

async function read(request: Request) {
  const raw: unknown = await request.json()
  return Effect.runPromise(Schema.decodeUnknownEffect(Person)(raw))
}
```

## Non-conformant

```ts
interface Person {
  readonly name: string
}

function read(input: string) {
  return JSON.parse(input) as Person
}
```
