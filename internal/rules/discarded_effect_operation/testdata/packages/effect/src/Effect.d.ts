export interface Effect<A, E = never, R = never> {
  readonly _A?: A
  readonly _E?: E
  readonly _R?: R
  [Symbol.iterator](): Generator<Effect<A, E, R>, A, unknown>
}

export declare const log: (...values: ReadonlyArray<unknown>) => Effect<void>
export declare const runSync: <A, E, R>(effect: Effect<A, E, R>) => A
export declare const gen: <A>(body: () => Generator<Effect<unknown, unknown, unknown>, A, unknown>) => Effect<A>
export declare function fn<A>(body: (...args: ReadonlyArray<unknown>) => Generator<Effect<unknown, unknown, unknown>, A, unknown>): (...args: ReadonlyArray<unknown>) => Effect<A>
export declare function fn(name: string): <A>(body: (...args: ReadonlyArray<unknown>) => Generator<Effect<unknown, unknown, unknown>, A, unknown>) => (...args: ReadonlyArray<unknown>) => Effect<A>
