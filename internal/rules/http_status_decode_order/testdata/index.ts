import { Effect, Schema } from "effect"
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"
import { decodeUnknownEffect as decode } from "effect/Schema"

interface User {
  readonly id: string
}

declare const User: Schema.Schema<User>
declare const ErrorBody: Schema.Schema<{ readonly error: string }>

declare function localDecode(value: unknown): User

function missingStatus(response: Response) {
  return Schema.decodeUnknownEffect(User)(response.json())
}

function aliasedDecoder(response: Response) {
  return decode(User)(response.json())
}

function guarded(response: Response) {
  if (!response.ok) throw new Error("request failed")
  return Schema.decodeUnknownEffect(User)(response.json())
}

function errorBody(response: Response) {
  if (!response.ok) return Schema.decodeUnknownEffect(ErrorBody)(response.json())
  return Schema.decodeUnknownEffect(User)(response.json())
}

function unrelatedStatus(response: Response, other: Response) {
  const ignored = localDecode(other.json())
  return Schema.decodeUnknownEffect(User)(response.json())
}

function classified(response: HttpClientResponse.HttpClientResponse) {
  return Effect.flatMap(HttpClientResponse.filterStatusOk(response), (ok) =>
    Schema.decodeUnknownEffect(User)(ok.json))
}

function jointStatus(response: HttpClientResponse.HttpClientResponse) {
  return HttpClientResponse.schemaJson(User)(response)
}

function rawAdapter(response: Response): Promise<unknown> {
  return response.json()
}

function shadowed(response: { json(): unknown }) {
  return decode(User)(response.json())
}
