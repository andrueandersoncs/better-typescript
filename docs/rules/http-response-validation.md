# http-response-validation

## What it does

Reports a resolved Web `Response.json()` call or Effect `HttpClientResponse.json` property when its unknown JSON representation is directly promoted to a concrete domain type. Raw adapters may return `unknown`, but a Schema decoder must consume the same value. Lookalike `json` members and unrelated decoders do not affect the result.

Raw `unknown` aliases and `Schema.Json` remain valid, including Promise/Effect wrappers. An `unknown` field inside a domain record does not make that domain record raw. Direct reassignment ends a tracked body-value relationship.

## When to use it

Use it where an HTTP response becomes an application domain value.

## Conformant

```ts
import { Effect, Schema } from "effect"
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"

const User = Schema.Struct({ id: Schema.String })

async function load(response: Response) {
  const raw: unknown = await response.json()
  return Effect.runPromise(Schema.decodeUnknownEffect(User)(raw))
}

const fromEffectResponse = (response: HttpClientResponse.HttpClientResponse) =>
  Effect.flatMap(response.json, Schema.decodeUnknownEffect(User))
```

## Non-conformant

```ts
interface User {
  readonly id: string
}

async function load(response: Response) {
  return (await response.json()) as User
}
```
