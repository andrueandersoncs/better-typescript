export declare const TypeId: unique symbol

export interface Effect<A, E = never, R = never> {
  readonly [TypeId]: {
    readonly _A: (_: never) => A
    readonly _E: (_: E) => never
    readonly _R: (_: R) => never
  }
}

export declare const succeed: <A>(value: A) => Effect<A>
export declare const runPromise: <A, E, R>(effect: Effect<A, E, R>) => Promise<A>
