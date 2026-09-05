# raw-fetch-outside-adapter

## What it does

Reports a resolved built-in `fetch` unless it is in an `adapter` or `adapters` path, directly executed by an actual Effect `tryPromise` callback, or inside a direct `HttpClient.make` runner. Expression and block callbacks, including object `try` methods, have the same boundary. A nested deferred callback is not direct ownership.

## When to use it

Use it to keep raw network access at explicit boundaries. `tryPromise` is an Effect boundary; application code wrapped there is separately covered by `http-client-preference`.

## Conformant

```ts
import * as Effect from "effect/Effect"

Effect.tryPromise(() => {
  return fetch("/transport")
})
```

## Non-conformant

```ts
fetch("/application")
```
