export interface Effect<A, E = never, R = never> {
  readonly _A?: A
  readonly _E?: E
  readonly _R?: R
}

export declare const flatMap: <A, B, E, R>(effect: Effect<A, E, R>, f: (value: A) => Effect<B>) => Effect<B, E, R>
