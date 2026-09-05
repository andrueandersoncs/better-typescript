import type { Effect } from "./Effect"

export type Json = null | boolean | number | string | ReadonlyArray<Json> | { readonly [key: string]: Json }

export interface Schema<A> {
  readonly Type: A
}

export declare const decodeUnknownEffect: <A>(schema: Schema<A>) => (input: unknown) => Effect<A>
