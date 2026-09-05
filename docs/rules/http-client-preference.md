# http-client-preference

## What it does

Reports a resolved built-in `fetch` directly executed by a resolved Effect `tryPromise` callback, including an object `try` property or method. It does not use comments, imports, or other file text as an exemption. A fetch that implements a direct `HttpClient.make` runner is the transport adapter itself and is allowed.

## When to use it

Use it in application Effect code to prefer the typed HTTP client. Raw fetch outside an Effect boundary belongs to `raw-fetch-outside-adapter`; a direct raw transport implementation belongs to `HttpClient.make`.

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

Effect.tryPromise(() => fetch("https://example.com"))
```
