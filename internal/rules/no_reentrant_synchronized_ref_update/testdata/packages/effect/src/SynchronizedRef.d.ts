import type { Effect } from "./Effect.js"

export interface SynchronizedRef<A> {
  readonly _A?: A
}

export declare const get: <A>(ref: SynchronizedRef<A>) => Effect<A>
export declare const modify: <A, B>(ref: SynchronizedRef<A>, update: (value: A) => readonly [B, A]) => Effect<B>
export declare const getAndUpdate: <A>(ref: SynchronizedRef<A>, update: (value: A) => A) => Effect<A>
export declare const update: <A>(ref: SynchronizedRef<A>, update: (value: A) => A) => Effect<void>
export declare const updateEffect: <A>(ref: SynchronizedRef<A>, update: (value: A) => Effect<A>) => Effect<void>
