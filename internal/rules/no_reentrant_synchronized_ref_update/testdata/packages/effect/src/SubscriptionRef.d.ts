import type { Effect } from "./Effect.js"

export interface SubscriptionRef<A> {
  readonly _A?: A
}

export declare const modify: <A, B>(ref: SubscriptionRef<A>, update: (value: A) => readonly [B, A]) => Effect<B>
export declare const modifyEffect: <A, B>(ref: SubscriptionRef<A>, update: (value: A) => Effect<readonly [B, A]>) => Effect<B>
