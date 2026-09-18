export interface Effect<A, E = never, R = never> {
  readonly _A?: A
  readonly _E?: E
  readonly _R?: R
  [Symbol.iterator](): Generator<Effect<A, E, R>, A, unknown>
}

export declare const gen: <A>(body: () => Generator<Effect<unknown, unknown, unknown>, A, unknown>) => Effect<A>
export declare const succeed: <A>(value: A) => Effect<A>
export declare const suspend: <A, E, R>(evaluate: () => Effect<A, E, R>) => Effect<A, E, R>
