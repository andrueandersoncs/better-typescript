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

export const httpGet = (url: string): Promise<Response> => fetch(url)
export function httpPost(url: string, body: string): Promise<Response> {
  return fetch(url, { method: "POST", body })
}

void (function applicationFetch() { return fetch("/iife") })()

class HttpFixture {
  httpGet(): Promise<Response> {
    return fetch("/class-method")
  }
}
void HttpFixture

const httpFixture = {
  httpGet(): Promise<Response> {
    return fetch("/object-method")
  },
}
void httpFixture

void (() => fetch("/anonymous"))()

export function applicationLoad(url: string): Promise<Response> {
  const request = new Request(url)
  return fetch(request)
}

{
  const fetch = (url: string) => Promise.resolve(new Response(url))
  fetch("/shadowed")
}

export const httpPut = function (url: string): Promise<Response> {
  return fetch(url, { method: "PUT" })
}

declare function useTransport(callback: () => Promise<Response>): void
useTransport(() => fetch("/callback"))
