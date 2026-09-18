import type { Effect } from "./Effect.js"

export interface Queue<A> {
  readonly _A?: A
}

export declare const bounded: <A>(capacity: number) => Effect<Queue<A>>
export declare const offerAll: <A>(queue: Queue<A>, values: Iterable<A>) => Effect<boolean>
