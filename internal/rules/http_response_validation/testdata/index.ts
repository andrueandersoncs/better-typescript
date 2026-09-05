import { decodeUnknownEffect as decode, type Schema } from "effect/Schema"

import type { HttpClientResponse } from "effect/unstable/http/HttpClientResponse"

interface User {
  readonly id: string
}

declare function decodeUnknownEffect(value: unknown): User
declare const UserSchema: Schema<User>

async function webBad(response: Response) {
  const user: User = await response.json()
  return user
}

function effectBad(response: HttpClientResponse) {
  return response.json as unknown as User
}

function aliasedEffectResponse(response: HttpClientResponse) {
  const body = response
  return body.json as unknown as User
}

async function decodedSameValue(response: Response) {
  const raw: unknown = await response.json()
  return decode(UserSchema)(raw)
}

async function unrelatedDecoder(response: Response) {
  const ignored = decodeUnknownEffect(await response.json())
  return (await response.json()) as User
}

function rawAdapter(response: Response): Promise<unknown> {
  return response.json()
}

function unrelated(value: { readonly json: unknown }) {
  return value.json as User
}

class HttpClientResponseShadow {
  readonly json: unknown = { id: "not-a-response" }
}

function shadowed(response: HttpClientResponseShadow) {
  return response.json as User
}

async function typedReturn(response: Response): Promise<User> {
  return response.json()
}
