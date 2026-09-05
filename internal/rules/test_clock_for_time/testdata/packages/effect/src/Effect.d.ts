export declare const TypeId: unique symbol

export interface Effect<A, E = never, R = never> {
  readonly [TypeId]: {
    readonly _A: A
    readonly _E: E
    readonly _R: R
  }
  [Symbol.iterator](): Iterator<Effect<unknown, unknown, unknown>, A, any>
}

export declare const sleep: (duration: number | string) => Effect<void>
export declare const succeed: <A>(value: A) => Effect<A>
export declare const gen: <A>(f: () => Generator<Effect<unknown, unknown, unknown>, A, any>) => Effect<A>
export declare const forkChild: <A, E, R>(effect: Effect<A, E, R>) => Effect<{ readonly value: A }, never, R>
