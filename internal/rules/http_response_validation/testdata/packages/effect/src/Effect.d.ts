export interface Effect<A, E = never, R = never> {
  readonly _A?: A
  readonly _E?: E
  readonly _R?: R
}
