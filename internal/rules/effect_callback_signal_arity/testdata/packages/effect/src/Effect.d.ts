export interface Effect<A, E = never, R = never> {
  readonly _A?: A
  readonly _E?: E
  readonly _R?: R
}

export declare const promise: <A>(evaluate: (signal: AbortSignal) => PromiseLike<A>) => Effect<A>
export declare const tryPromise: <A>(evaluate: ((signal: AbortSignal) => PromiseLike<A>) | { readonly try: (signal: AbortSignal) => PromiseLike<A>; readonly catch: (error: unknown) => unknown }) => Effect<A>
export declare const callback: <A>(register: (resume: (effect: Effect<A>) => void, signal: AbortSignal) => void) => Effect<A>
export declare const succeed: <A>(value: A) => Effect<A>
