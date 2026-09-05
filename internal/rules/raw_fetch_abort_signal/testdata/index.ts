import * as Effect from "effect/Effect"
import * as HttpClient from "effect/unstable/http/HttpClient"
import type { HttpClientError } from "effect/unstable/http/HttpClientError"
import type { HttpClientResponse } from "effect/unstable/http/HttpClientResponse"

declare const response: HttpClientResponse
declare const transportError: HttpClientError

Effect.tryPromise((signal) => fetch("/missing"))
Effect.tryPromise((signal) => fetch("/ok", { signal }))
Effect.tryPromise({ try: (signal) => fetch("/object", { signal }), catch: () => new Error("transport") })
Effect.tryPromise((signal) => fetch("/overwritten", { ...({ signal } as RequestInit), signal: undefined }))
Effect.tryPromise((signal) => fetch("/unknown", { signal, ...({} as RequestInit) }))
HttpClient.make((request, url, signal) => Effect.tryPromise({ try: () => fetch(url, { signal }).then(() => response), catch: () => transportError }))
Effect.tryPromise({ try(signal) { return fetch("/method", { signal }) }, catch: () => new Error("transport") })
Effect.tryPromise(((signal) => fetch("/wrapped", { signal })))
Effect.tryPromise(function(this: void, signal) { return fetch("/this", { signal }) })
Effect.tryPromise((signal) => fetch("/undefined", undefined))

{
  const fetch = (url: string) => Promise.resolve(new Response(url))
  Effect.tryPromise((signal) => fetch("/shadowed"))
}
