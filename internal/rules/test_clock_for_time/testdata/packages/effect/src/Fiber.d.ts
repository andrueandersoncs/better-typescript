import type { Effect } from "./Effect.js"

export declare const join: <A>(fiber: { readonly value: A }) => Effect<A>
export declare const interrupt: <A>(fiber: { readonly value: A }) => Effect<void>
