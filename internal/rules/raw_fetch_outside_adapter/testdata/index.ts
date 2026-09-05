import * as Effect from "effect/Effect"
import * as HttpClient from "effect/unstable/http/HttpClient"
import type { HttpClientError } from "effect/unstable/http/HttpClientError"
import type { HttpClientResponse } from "effect/unstable/http/HttpClientResponse"

declare const response: HttpClientResponse
declare const transportError: HttpClientError

fetch("/outside")
Effect.tryPromise(() => fetch("/expression"))
Effect.tryPromise(() => {
  return fetch("/block")
})
Effect.tryPromise(() => {
  const deferred = () => fetch("/deferred")
  return deferred()
})
HttpClient.make((request, url, signal) => Effect.tryPromise({ try: () => fetch(url, { signal }).then(() => response), catch: () => transportError }))
Effect.tryPromise((() => fetch("/wrapped")))
Effect.tryPromise({ try() { return fetch("/method") }, catch: () => new Error("transport") })

{
  const fetch = (url: string) => Promise.resolve(new Response(url))
  fetch("/shadowed")
}
