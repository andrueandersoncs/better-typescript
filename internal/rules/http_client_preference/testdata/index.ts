import * as Effect from "effect/Effect"
import { tryPromise as wrap } from "effect/Effect"
import * as HttpClient from "effect/unstable/http/HttpClient"
import type { HttpClientError } from "effect/unstable/http/HttpClientError"
import type { HttpClientResponse } from "effect/unstable/http/HttpClientResponse"

declare const response: HttpClientResponse
declare const transportError: HttpClientError

Effect.tryPromise(() => fetch("https://example.com"))
wrap(() => fetch("https://example.com"))
Effect.tryPromise({ try: () => fetch("https://example.com"), catch: () => new Error("transport") })
HttpClient.make((request, url, signal) => Effect.tryPromise({ try: () => fetch(url, { signal }).then(() => response), catch: () => transportError }))
Effect.tryPromise((() => fetch("https://wrapped.example.com")))
Effect.tryPromise({ try() { return fetch("https://method.example.com") }, catch: () => new Error("transport") })

{
  const Effect = { tryPromise: (run: () => Promise<Response>) => run() }
  Effect.tryPromise(() => fetch("https://shadowed-effect.example"))
}

{
  const fetch = (url: string) => Promise.resolve(new Response(url))
  Effect.tryPromise(() => fetch("https://shadowed-fetch.example"))
}
