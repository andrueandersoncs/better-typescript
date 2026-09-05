import type { Effect } from "../../Effect"
import type { Json, Schema } from "../../Schema"

export interface HttpClientResponse {
  readonly json: Effect<Json>
}

export declare const filterStatusOk: (self: HttpClientResponse) => Effect<HttpClientResponse>
export declare const filterStatus: (self: HttpClientResponse, predicate: (status: number) => boolean) => Effect<HttpClientResponse>
export declare const matchStatus: (self: HttpClientResponse, cases: object) => unknown
export declare const schemaJson: <A>(schema: Schema<A>) => (self: HttpClientResponse) => Effect<A>
