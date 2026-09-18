export interface Effect<A, E = never, R = never> {
  readonly _A?: A
  readonly _E?: E
  readonly _R?: R
  [Symbol.iterator](): Generator<Effect<A, E, R>, A, unknown>
}

export declare const gen: <A>(body: () => Generator<Effect<unknown, unknown, unknown>, A, unknown>) => Effect<A>
export declare const log: (...values: ReadonlyArray<unknown>) => Effect<void>
