# raw-fetch-abort-signal

## What it does

Reports a resolved built-in `fetch` directly executed by an Effect `tryPromise` callback when its effective object-literal `init.signal` is not that callback's signal or the enclosing direct `HttpClient.make` runner signal. It recognizes expression and block callbacks, including an object callback's `try` property or method. A missing init or `signal: undefined` reports. An unknown init or a spread that can overwrite `signal` is left unclassified.

## When to use it

Use it when adapting a Promise-based fetch operation to Effect so interruption reaches the network request. A direct `HttpClient.make` adapter owns its runner signal and may forward it through a zero-argument `tryPromise` callback.

## Conformant

```ts
import * as Effect from "effect/Effect"
import * as HttpClient from "effect/unstable/http/HttpClient"
import * as HttpClientError from "effect/unstable/http/HttpClientError"
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"

declare const response: HttpClientResponse.HttpClientResponse
declare const transportError: HttpClientError.HttpClientError

HttpClient.make((request, url, signal) =>
  Effect.tryPromise({
    try: () => fetch(url, { signal }).then(() => response),
    catch: () => transportError,
  }),
)
```

## Non-conformant

```ts
import * as Effect from "effect/Effect"

Effect.tryPromise((signal) => fetch("/bad", { signal: undefined }))
```
