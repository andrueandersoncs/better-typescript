import type { Effect } from "./Effect.js"

export interface TxQueue<A> {
  readonly _A?: A
}

export declare const bounded: <A>(capacity: number) => Effect<TxQueue<A>>
export declare const offerAll: <A>(queue: TxQueue<A>, values: Iterable<A>) => Effect<boolean>
