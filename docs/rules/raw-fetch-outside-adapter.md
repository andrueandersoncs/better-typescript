# raw-fetch-outside-adapter

## What it does

Reports a resolved built-in `fetch` unless it is in an `adapter` or `adapters` path, is the direct sole return value of a named top-level adapter function, is directly executed by an actual Effect `tryPromise` callback, or is inside a direct `HttpClient.make` runner. Expression and block callbacks, including object `try` methods, have the same boundary. Anonymous application calls and nested deferred callbacks are not direct adapter ownership.

## When to use it

Use it to keep raw network access at explicit boundaries. `tryPromise` is an Effect boundary; application code wrapped there is separately covered by `http-client-preference`.

## Conformant

```ts
import * as Effect from "effect/Effect"

Effect.tryPromise(() => {
  return fetch("/transport")
})

export const httpGet = (url: string) => fetch(url)

export function httpPost(url: string, body: string) {
  return fetch(url, { method: "POST", body })
}
```

## Non-conformant

```ts
fetch("/application")
```
