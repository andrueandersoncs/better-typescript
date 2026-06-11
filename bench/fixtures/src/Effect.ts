// Phantom stand-in for the effect package's Effect interface. prefer-effect-fn only
// accepts a return type whose `Effect` symbol is declared in a file named Effect.ts
// (or Effect.d.ts), so the phantom must live in this module — a same-named local file
// keeps the fixtures free of a dependency on the real effect package.
export interface Effect<A, E, R> {
  readonly success: A
  readonly failure: E
  readonly requirements: R
}

export declare const succeed: <A>(value: A) => Effect<A, never, never>

export declare const fromValue: <A>(value: A) => Effect<A, never, never>
